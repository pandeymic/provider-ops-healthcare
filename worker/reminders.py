"""Dry-run reminder job for synthetic appointments.

It intentionally prints a report rather than contacting a real messaging service.
Run with: python worker/reminders.py
"""
from datetime import datetime, timedelta, timezone

DEMO_APPOINTMENTS = [
    {"id": "apt-301", "patient": "Jordan R.", "provider": "Dr. Maya Chen", "starts_at": datetime.now(timezone.utc) + timedelta(hours=2)},
    {"id": "apt-302", "patient": "Taylor K.", "provider": "Dr. Elias Brooks", "starts_at": datetime.now(timezone.utc) + timedelta(hours=5)},
]

def build_reminder_report(appointments):
    return [{"appointment_id": item["id"], "channel": "dry-run", "message": f"Reminder prepared for synthetic patient {item['patient']} with {item['provider']}."} for item in appointments]

if __name__ == "__main__":
    print(f"Reminder worker run at {datetime.now(timezone.utc).isoformat()}")
    for reminder in build_reminder_report(DEMO_APPOINTMENTS):
        print(f"[DRY RUN] {reminder['appointment_id']}: {reminder['message']}")
