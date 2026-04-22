from django.urls import path
from . import views

urlpatterns = [
    path('threads/', views.ChatThreadView.as_view(), name='chat_threads'),
    path('threads/<int:thread_id>/messages/', views.ChatMessageView.as_view(), name='chat_messages'),
]
