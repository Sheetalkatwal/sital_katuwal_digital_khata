from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from accounts.models import Business, Customer, CustomerRequest, MyUser
from accounts.permissions import IsShopkeeper, IsUser
from .models import ChatThread, ChatMessage
from .serializers import ChatThreadSerializer, ChatMessageSerializer


class ChatThreadView(APIView):
    permission_classes = [IsShopkeeper | IsUser]

    def get(self, request):
        user = request.user
        if user.role == 'shopkeeper':
            business = get_object_or_404(Business, owner=user)
            threads = ChatThread.objects.filter(business=business).select_related('customer__user', 'business__owner')
        else:
            customer = get_object_or_404(Customer, user=user)
            threads = ChatThread.objects.filter(customer=customer).select_related('business__owner')
        serializer = ChatThreadSerializer(threads, many=True)
        return Response({'threads': serializer.data})

    def post(self, request):
        user = request.user
        if user.role == 'shopkeeper':
            customer_id = request.data.get('customer_id')
            if not customer_id:
                return Response({'error': 'customer_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            customer = get_object_or_404(Customer, id=customer_id)
            business = get_object_or_404(Business, owner=user)
        else:
            business_id = request.data.get('business_id')
            if not business_id:
                return Response({'error': 'business_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            business = get_object_or_404(Business, id=business_id)
            customer = get_object_or_404(Customer, user=user)

        if not CustomerRequest.objects.filter(user=customer, business=business, status='accepted').exists():
            return Response({'error': 'Chat is only available for connected customers.'}, status=status.HTTP_403_FORBIDDEN)

        thread, _ = ChatThread.objects.get_or_create(business=business, customer=customer)
        serializer = ChatThreadSerializer(thread)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatMessageView(APIView):
    permission_classes = [IsShopkeeper | IsUser]

    def get_thread(self, user, thread_id):
        thread = get_object_or_404(ChatThread, id=thread_id)
        if user.role == 'shopkeeper':
            if thread.business.owner != user:
                raise PermissionError('Not authorized for this thread.')
        else:
            if thread.customer.user != user:
                raise PermissionError('Not authorized for this thread.')
        return thread

    def get(self, request, thread_id):
        try:
            thread = self.get_thread(request.user, thread_id)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        messages = thread.messages.select_related('sender').order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True)

        if request.user.role == 'shopkeeper':
            thread.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        else:
            thread.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        return Response({'messages': serializer.data})

    def post(self, request, thread_id):
        try:
            thread = self.get_thread(request.user, thread_id)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        body = request.data.get('body', '').strip()
        if not body:
            return Response({'error': 'Message body cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            message = ChatMessage.objects.create(thread=thread, sender=request.user, body=body)
            thread.save(update_fields=['updated_at'])

        serializer = ChatMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
