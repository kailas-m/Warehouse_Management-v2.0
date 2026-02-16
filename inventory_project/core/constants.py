"""
Centralized constants for the Warehouse Management System.

This module contains all global constants used across the application,
including user roles, request statuses, and default configuration values.
"""


class UserRole:
    """User role constants."""
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"
    VIEWER = "VIEWER"

    CHOICES = [
        (ADMIN, "Admin"),
        (MANAGER, "Manager"),
        (STAFF, "Staff"),
        (VIEWER, "Viewer"),
    ]


class RequestStatus:
    """Request status constants for purchase, transfer, and promotion workflows."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

    CHOICES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
    ]


class Gender:
    """Gender choice constants for user profiles."""
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"

    CHOICES = [
        (MALE, "Male"),
        (FEMALE, "Female"),
        (OTHER, "Other"),
    ]


# Configuration Defaults
DEFAULT_LOW_STOCK_THRESHOLD = 10
DEFAULT_PAGE_SIZE = 10
