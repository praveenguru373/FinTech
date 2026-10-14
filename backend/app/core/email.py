import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("fintech.auth.email")


def send_account_link(*, recipient: str, subject: str, url: str) -> None:
    if not settings.email_delivery_configured:
        if settings.app_env not in {"development", "test"}:
            raise RuntimeError("Email delivery is not configured.")
        logger.warning("Development-only email link for %s: %s", recipient, url)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        f"Use this single-use FinTech link. It expires automatically.\n\n{url}\n\n"
        "If you did not request this, you can ignore this message."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
        if settings.smtp_starttls:
            client.starttls()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password or "")
        client.send_message(message)
