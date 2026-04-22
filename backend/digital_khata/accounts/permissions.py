from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsUser(BasePermission):
    """Allows access only to users with role 'user'."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'user'


class IsShopkeeper(BasePermission):
    """Allows access only to users with role 'shopkeeper'."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'shopkeeper'


class IsAdmin(BasePermission):
    """Allows access only to users with role 'admin'."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class ISOwnerOrReadOnly(BasePermission):
    """
    Custom permission:
    - Allow read access to everyone (including unauthenticated users)
    - Allow write access only to authenticated shopkeepers who own the resource
    """

    def has_permission(self, request, view):
        # Allow all safe methods (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            return True

        # For write operations, user must be authenticated and be a shopkeeper
        return request.user.is_authenticated and request.user.role == 'shopkeeper'

    def has_object_permission(self, request, view, obj):
        # Allow all safe methods
        if request.method in SAFE_METHODS:
            return True

        # For write operations, user must be the owner of the business
        return obj.business.owner == request.user