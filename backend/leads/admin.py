from django.contrib import admin
from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("nome", "cidade", "whats", "valor_conta", "recaptcha_score", "created_at")
    list_filter = ("cidade", "created_at")
    search_fields = ("nome", "whats", "cidade")
