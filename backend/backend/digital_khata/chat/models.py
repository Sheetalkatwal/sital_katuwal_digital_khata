from django.db import models
from accounts.models import Business, Customer, MyUser


class ChatThread(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='chat_threads')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='chat_threads')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('business', 'customer')
        ordering = ['-updated_at']

    def __str__(self):
        return f"Chat between {self.business.business_name} and {self.customer.user.get_full_name()}"


class ChatMessage(models.Model):
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='chat_messages')
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.email} at {self.created_at}"
