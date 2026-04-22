from rest_framework import serializers
from .models import ChatThread, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'thread', 'sender', 'sender_role', 'sender_name', 'body', 'is_read', 'created_at']
        read_only_fields = ['id', 'thread', 'sender', 'sender_role', 'sender_name', 'is_read', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.email


class ChatThreadSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.user.get_full_name', read_only=True)
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = ['id', 'business', 'business_name', 'customer', 'customer_name', 'created_at', 'updated_at', 'last_message']
        read_only_fields = ['id', 'business_name', 'customer_name', 'created_at', 'updated_at', 'last_message']

    def get_last_message(self, obj):
        message = obj.messages.order_by('-created_at').first()
        if not message:
            return None
        return {
            'body': message.body,
            'sender_role': message.sender.role,
            'created_at': message.created_at,
        }
