from rest_framework import permissions

class IsSeguridad(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'seguridad'

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'admin'
    
class IsSeguridadOrAdmin(permissions.BasePermission):
    """
    Permite el acceso si el usuario está autenticado y es vigilante (seguridad) o administrador.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.rol == 'seguridad' or request.user.rol == 'admin')