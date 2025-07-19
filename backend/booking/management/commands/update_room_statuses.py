from django.core.management.base import BaseCommand
from booking.models import Room


class Command(BaseCommand):
    help = 'Обновляет статусы всех номеров на основе активных бронирований'

    def handle(self, *args, **options):
        rooms = Room.objects.filter(is_deleted=False)
        updated_count = 0
        
        for room in rooms:
            old_status = room.status
            room.update_status()
            if old_status != room.status:
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Номер {room.number}: {old_status} → {room.status}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Обновлено статусов: {updated_count} из {rooms.count()} номеров'
            )
        ) 