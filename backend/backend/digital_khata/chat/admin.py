from django.contrib import admin
from .models import ChatThread, ChatMessage


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ('id', 'business', 'customer', 'updated_at')
    search_fields = ('business__business_name', 'customer__user__email')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'thread', 'sender', 'created_at', 'is_read')
    search_fields = ('thread__business__business_name', 'thread__customer__user__email', 'sender__email')
    list_filter = ('is_read',)
