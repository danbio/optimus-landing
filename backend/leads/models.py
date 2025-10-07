from django.db import models


class Lead(models.Model):
    nome = models.CharField(max_length=120)
    whats = models.CharField(max_length=60)
    cidade = models.CharField(max_length=80)
    valor_conta = models.DecimalField(max_digits=10, decimal_places=2)
    consent = models.BooleanField(default=False)
    recaptcha_score = models.FloatField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # Campo id é criado automaticamente pelo Django (AutoField). Presente em runtime.

    def __str__(self) -> str:
        return f"{self.nome} - {self.cidade} ({self.created_at:%Y-%m-%d})"
