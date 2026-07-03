"""
Test Resend Email Integration
Verify that your Resend API key is correct and email delivery works.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_resend_connection():
    """Test Resend API key and send a test email"""
    
    RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
    EMAIL_FROM = os.getenv('EMAIL_FROM', 'SmartFarm <onboarding@resend.dev>')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', '')
    
    print("=" * 70)
    print("RESEND EMAIL API TEST")
    print("=" * 70)
    print(f"\nAPI Key: {RESEND_API_KEY[:8]}...{RESEND_API_KEY[-4:]}" if len(RESEND_API_KEY) > 12 else f"\nAPI Key: {RESEND_API_KEY}")
    print(f"From: {EMAIL_FROM}")
    print(f"Test recipient: {ADMIN_EMAIL or '(not set - using EMAIL_FROM)'}")
    
    # Validate API key
    if not RESEND_API_KEY or RESEND_API_KEY == 're_YOUR_API_KEY_HERE':
        print("\n❌ ERROR: RESEND_API_KEY not set in .env")
        print("\n  Get your API key at: https://resend.com")
        print("  Then set it in .env: RESEND_API_KEY=re_xxxxxxxxxxxx")
        return False
    
    print("\n" + "-" * 70)
    print("Sending test email via Resend API...")
    print("-" * 70)
    
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        
        # Determine recipient
        to_email = ADMIN_EMAIL or 'delivered@resend.dev'
        
        html_body = """
        <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c5f2d;">✅ Resend API Test Successful!</h2>
                    <p>This is a test email to verify your Resend API configuration is working correctly.</p>
                    <p>If you received this email, your email service is configured properly.</p>
                    <hr style="border: 1px solid #eee;">
                    <p style="color: #888; font-size: 12px;">SmartFarming - Email Service Test</p>
                </div>
            </body>
        </html>
        """
        
        params = {
            "from": EMAIL_FROM,
            "to": [to_email],
            "subject": "Resend API Test - SmartFarming",
            "html": html_body,
            "text": "Resend API Test Successful! Your email configuration is working properly.",
        }
        
        print(f"[1/2] Sending to {to_email}...")
        response = resend.Emails.send(params)
        
        email_id = response.get('id', 'unknown') if isinstance(response, dict) else getattr(response, 'id', 'unknown')
        print(f"✅ Email sent! (ID: {email_id})")
        
        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED - RESEND IS CONFIGURED CORRECTLY!")
        print("=" * 70)
        print(f"\nCheck {to_email} inbox for the test email.")
        print("You can also track delivery at: https://resend.com/emails")
        return True
    
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("\nCommon causes:")
        print("  1. Invalid API key")
        print("  2. Network connectivity issue")
        print("  3. Resend SDK not installed (pip install resend)")
        return False

if __name__ == "__main__":
    success = test_resend_connection()
    sys.exit(0 if success else 1)
