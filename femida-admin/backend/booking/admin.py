from django.contrib import admin
from .models import User, Room, Guest, Booking
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from datetime import date

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('number', 'room_class', 'description')

@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'inn', 'phone')
    search_fields = ('full_name', 'inn', 'phone')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('room', 'guest', 'date_from', 'date_to', 'status_colored')
    list_filter = ('room__room_class', 'date_from', 'date_to')
    search_fields = ('guest__full_name', 'room__number')

    def status_colored(self, obj):
        today = date.today()
        if obj.date_from <= today <= obj.date_to:
            color = 'red'
            status = _('Занято')
        else:
            color = 'green'
            status = _('Свободно')
        return format_html('<span style="color: {};">{}</span>', color, status)
    status_colored.short_description = 'Статус'

admin.site.register(User)
