from django.core.management.base import BaseCommand
from warehouses.models import Role


class Command(BaseCommand):
    help = "Seed default user roles (ADMIN, MANAGER, STAFF, VIEWER)"

    def handle(self, *args, **kwargs):
        role_names = [
            Role.ADMIN,
            Role.MANAGER,
            Role.STAFF,
            Role.VIEWER,
        ]

        created_count = 0

        for role_name in role_names:
            role, created = Role.objects.get_or_create(name=role_name)

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created role: {role_name}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Role already exists: {role_name}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Role seeding complete ({created_count} new roles created)"
            )
        )
