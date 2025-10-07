from django.contrib import admin
from django.urls import path
from optimus_backend.views import recaptcha_verify

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/recaptcha/verify/', recaptcha_verify, name='recaptcha_verify'),
]
