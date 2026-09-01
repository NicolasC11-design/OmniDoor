from django.urls import path
from .views import (
    RegisterView, LoginView, AdminGestionCuentasView, 
    AprobarUsuarioView, VehiculoListCreateView, VehiculoDetailView, 
    RegistroAccesoListCreateView, InformeTurnoCreateView, PerfilUsuarioView, 
    MisRegistrosAccesoView, CambiarPasswordView, AdminDashboardStatsView,
    UsuarioListCreateView, UsuarioDetailUpdateDeleteView,   
    ValidarPlacaBiometriaView, RegistrarBiometriaView, ValidarAccesoPorteriaView,
    LoginBiometricoView, DashboardAccesosView, InformeTurnoListView
)

urlpatterns = [
    # Autenticación
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/login-biometrico/', LoginBiometricoView.as_view(), name='auth-login-biometrico'),

    # Perfil del Usuario
    path('perfil/actualizar/', PerfilUsuarioView.as_view(), name='actualizar-perfil'),
    path('perfil/cambiar-password/', CambiarPasswordView.as_view(), name='cambiar-password'),

    # Gestión de Vehículos
    path('usuarios/vehiculos/todos/', VehiculoListCreateView.as_view(), name='vehiculos-todos'),
    path('usuarios/vehiculos/agregar/', VehiculoListCreateView.as_view(), name='vehiculos-agregar'),
    path('usuarios/vehiculos/actualizar/<uuid:id_vehiculo>/', VehiculoDetailView.as_view(), name='vehiculo-actualizar'),
    path('usuarios/vehiculos/eliminar/<uuid:id_vehiculo>/', VehiculoDetailView.as_view(), name='vehiculo-eliminar'),
    path('vehiculos/<uuid:id_vehiculo>/', VehiculoDetailView.as_view(), name='vehiculo-detail'),
    path('vehiculos/<uuid:id_vehiculo>/accesos/', RegistroAccesoListCreateView.as_view(), name='vehiculo-accesos'),

    # Validación y Portería
    path('accesos/validar-porteria/', ValidarAccesoPorteriaView.as_view(), name='validar-porteria'),
    path('accesos/dashboard/', DashboardAccesosView.as_view(), name='dashboard-accesos'),
    path('accesos/', RegistroAccesoListCreateView.as_view(), name='accesos-list'),
    path('informes-turno/', InformeTurnoCreateView.as_view(), name='informes-create'),
    path('usuarios/historial/mio/', MisRegistrosAccesoView.as_view(), name='mi-historial'),

    # Biometría
    path('biometria/enrolar/', RegistrarBiometriaView.as_view(), name='biometria-enrolar'),
    path('biometria/validar-placa/<str:placa>/', ValidarPlacaBiometriaView.as_view(), name='biometria-validar-placa'),

    # Administración
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('admin/usuarios-pendientes/', AdminGestionCuentasView.as_view(), name='usuarios-pendientes'),
    path('admin/aprobar-usuario/<uuid:id_usuario>/', AprobarUsuarioView.as_view(), name='aprobar-usuario'),
    path('admin/informes-turno/', InformeTurnoListView.as_view(), name='admin-informes-turno'),
    path('usuarios/', UsuarioListCreateView.as_view(), name='usuarios-list'),
    path('usuarios/<uuid:id_usuario>/', UsuarioDetailUpdateDeleteView.as_view(), name='usuario-detail-update-delete'),
]