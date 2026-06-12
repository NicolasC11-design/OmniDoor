from django.urls import path
from accesos.views import RegisterView, LoginView

urlpatterns = [
    path('api/auth/register', RegisterView.as_view(), name='auth_register'),
    path('api/auth/login', LoginView.as_view(), name='auth_login'),
]