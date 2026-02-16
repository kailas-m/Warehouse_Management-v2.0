
from django.core.management.base import BaseCommand
from accounts.models import User, Role, Staff

class Command(BaseCommand):
    help = 'Fixes existing managers by unassigning their staff warehouse'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Fixing existing Managers...'))
        
        managers = User.objects.filter(role__name=Role.MANAGER)
        count = 0
        
        for user in managers:
            try:
                staff = Staff.objects.get(user=user)
                if staff.warehouse:
                    self.stdout.write(f"Unassigning warehouse for Manager: {user.username} (was in {staff.warehouse.name})")
                    staff.warehouse = None
                    staff.save()
                    count += 1
                else:
                    self.stdout.write(f"Manager {user.username} is clean.")
            except Staff.DoesNotExist:
                self.stdout.write(f"Manager {user.username} has no staff record.")
        
        self.stdout.write(self.style.SUCCESS(f'Successfully fixed {count} managers.'))
