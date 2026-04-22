
from celery import shared_task
from helper_functions.validation import send_email

@shared_task
def send_email_task(to, subject, body):
    """
    Celery task to send an email.

    Args:
        to (str): Recipient email address.
        subject (str): Subject of the email.
        body (str): Body content of the email.
    """
    send_email(to, subject, body)