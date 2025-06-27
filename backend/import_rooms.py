from booking.models import Room

rooms = [
    # Стандарт
    {"number": "№1", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№2", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№3", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№4", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№5", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№6", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№7", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№9", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},
    {"number": "№10", "room_class": "standard", "description": "3 комнаты: 2x3-местн, 1x2-местн"},

    # 3-х этажка люкс
    {"number": "№5", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№6", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№7", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№8", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№10", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№11", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№12", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№13", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№14", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№15", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№16", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "№17", "room_class": "lux", "description": "2 комнаты, 3-местн"},

    # Средний ВИП люкс
    {"number": "Средний ВИП комната №1", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "Средний ВИП комната №2", "room_class": "lux", "description": "2 комнаты, 3-местн"},
    {"number": "Средний ВИП дом", "room_class": "lux", "description": "1 большой дом, 2 комнаты, 6 мест"},

    # Полулюкс (розовые)
] + [
    {"number": f"Розовый №{i}", "room_class": "semi_lux", "description": "1 комната, 3-местн"}
    for i in range(1, 37)
] + [
    # Аврора полулюкс
    {"number": f"Аврора №{i}", "room_class": "semi_lux", "description": "1 комната, 3-местн"}
    for i in range(1, 17)
] + [
    # Домики полулюкс
    {"number": f"Домик №{i}", "room_class": "semi_lux", "description": "1 дом, 6 мест" if i < 7 else "1 дом, 7 мест"}
    for i in range(1, 8)
]

for room in rooms:
    Room.objects.get_or_create(number=room["number"], defaults={
        "room_class": room["room_class"],
        "description": room["description"]
    })

print(f"Добавлено {len(rooms)} номеров.")
