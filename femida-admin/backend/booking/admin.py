from django.contrib import admin
from .models import User, Room, Guest, Booking, Building, AuditLog
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from datetime import date

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('number', 'building', 'capacity', 'room_type', 'status', 'description')

@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'inn', 'people_count')
    search_fields = ('full_name', 'phone', 'inn')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('room', 'guest', 'check_in', 'check_out', 'status_colored')
    list_filter = ('room__building', 'check_in', 'check_out', 'status')
    search_fields = ('guest__full_name', 'room__number')

    def status_colored(self, obj):
        today = date.today()
        if obj.check_in <= today <= obj.check_out:
            color = 'red'
            status = 'Занято'
        else:
            color = 'green'
            status = 'Свободно'
        return f'<span style="color: {color};">{status}</span>'
    status_colored.short_description = 'Статус'
    status_colored.allow_tags = True

admin.site.register(User)
admin.site.register(Building)
admin.site.register(AuditLog)
