# SMS Configuration Guide

This guide explains how to set up and use SMS notifications in the Building Management System using Twilio.

## Prerequisites

1. A Twilio account (Sign up at [Twilio](https://www.twilio.com) if you don't have one)
2. Twilio Account SID
3. Twilio Auth Token
4. A Twilio phone number

## Configuration Steps

1. Navigate to the Settings page in your admin dashboard
2. Locate the "SMS Configuration" section
3. Fill in the following details:
   - Enable SMS Notifications: Toggle to activate SMS functionality
   - Provider: Select "Twilio" from the dropdown
   - Account SID: Enter your Twilio Account SID
   - Auth Token: Enter your Twilio Auth Token
   - From Number: Enter your Twilio phone number (format: +1234567890)

## Testing SMS Configuration

1. After saving your settings, use the "Test SMS" section
2. Enter a valid phone number (format: +1234567890)
3. Type a test message
4. Click "Send Test SMS"

## SMS Notification Features

Once configured, the system will automatically send SMS notifications for:

1. Bill generation
2. Payment reminders
3. Overdue notices
4. Maintenance updates
5. Important announcements

## Troubleshooting

If SMS sending fails:

1. Verify your Twilio credentials are correct
2. Ensure the phone number format is correct (+country_code followed by number)
3. Check if your Twilio account has sufficient credits
4. Verify that the Twilio number is active and capable of sending SMS

## Best Practices

1. Always test the SMS configuration after setup
2. Keep your Auth Token secure
3. Monitor SMS usage to manage costs
4. Use SMS templates for consistent messaging
5. Maintain an up-to-date phone number database

## Support

For additional assistance:
1. Check Twilio's documentation at https://www.twilio.com/docs
2. Contact your system administrator
3. Review the SMS delivery logs in the admin dashboard