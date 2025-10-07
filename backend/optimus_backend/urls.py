from django.contrib import admin
from django.urls import path
from optimus_backend.views import recaptcha_verify
from leads.views import create_lead

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/recaptcha/verify/', recaptcha_verify, name='recaptcha_verify'),
    path('api/leads/', create_lead, name='create_lead'),
]
