from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Clears the django_migrations table to reset migration history'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            self.stdout.write("Clearing django_migrations table...")
            cursor.execute("DELETE FROM django_migrations")
            self.stdout.write(self.style.SUCCESS("✅ django_migrations table cleared."))
