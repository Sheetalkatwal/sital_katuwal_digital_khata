from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

def checkEmptyFields(data, required_fields):
    """
    Check if any of the required fields are empty in the provided data dictionary.

    Args:
        data (dict): The data dictionary to check.
        required_fields (list): List of fields that are required.
    """
    for field in required_fields:
        if field not in data or not data[field]:
            return False
    return True


def validate_password_strength(password):
    """
    Validate the strength of the provided password.

    Args:
        password (str): The password string to validate.
    """
    if len(password) < 8:
        return {
            'status': False,
            'message': 'Password must be at least 8 characters long.'
        }
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(not c.isalnum() for c in password)

    return all([has_upper, has_lower, has_digit, has_special])


def validate_email(email):
    """
    Validate the format of the provided email address.

    Args:
        email (str): The email address to validate.
    """
    import re
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return {
            'status': False,
            'message': 'Invalid email format.'
        }
    return {
        'status': True,
        'message': 'Valid email format.'
    }


def generate_otp(length=6):
    """
    Generate a numeric OTP of specified length.

    Args:
        length (int): Length of the OTP to generate. Default is 6.
    """
    import random
    import string
    otp = ''.join(random.choices(string.digits, k=length))
    return otp


def send_email(to, subject, body):
    """
    Send an HTML email with dynamic subject and message.

    Args:
        to (str): Recipient email address
        subject (str): Subject of the email
        body (str): Message content (HTML allowed)
    """
    # HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{subject}</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f6f9fc;
                padding: 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                padding: 30px;
            }}
            .footer {{
                margin-top: 20px;
                font-size: 12px;
                color: #6b7280;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            {body}
            <div class="footer">
                &copy; 2025 Digital Khata. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text fallback
    text_content = body

    # Determine from_email: prefer EMAIL_HOST_USER, fallback to DEFAULT_FROM_EMAIL if available
    from_email = getattr(settings, "EMAIL_HOST_USER", None) or getattr(settings, "DEFAULT_FROM_EMAIL", None)

    # Create email object
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=from_email,
        to=[to]
    )

    email.attach_alternative(html_content, "text/html")
    email.send()
