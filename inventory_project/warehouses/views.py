from django.db import transaction, models
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import Q, Sum
from django.core.paginator import Paginator


# DRF core

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser


# Python stdlib

from datetime import datetime, timedelta
from collections import defaultdict


# Project utilities

from warehouses.utils.reports import generate_stock_movement_pdf
from core.utils import log_error

# import logging
# logger = logging.getLogger(__name__)
# # Simple file logging setup for debugging
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000

# debug_handler = logging.FileHandler('server_debug.log')
# debug_handler.setLevel(logging.ERROR)
# formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
# debug_handler.setFormatter(formatter)
# logger.addHandler(debug_handler)

# def log_error(msg):
#     with open("server_debug.log", "a") as f:
#         f.write(str(datetime.now()) + " " + str(msg) + "\n")



# Permissions

from warehouses.permissions import (
    IsAdmin,
    IsStaff,
    IsManager,
    IsManagerOrAdmin,
    CanViewProfile,
)

# Models
from accounts.models import User, UserProfile
from roles.models import Role, Viewer, Staff, Manager, StaffApproval, ManagerPromotionRequest
from warehouses.models import Warehouse, StaffTransferRequest
from inventory.models import Product, Stock, LowStockThreshold
from purchases.models import PurchaseRequest, PurchaseApproval
from transfers.models import TransferRequest, TransferApproval

# Serializers

from warehouses.serializers import (
    RegisterSerializer,
    WarehouseCreateSerializer,
    WarehouseListSerializer,
    ProductCreateSerializer,
    ProductReadSerializer,
    StockReadSerializer,
    StockAssignSerializer,
    PurchaseRequestCreateSerializer,
    PurchaseApprovalSerializer,
    TransferRequestCreateSerializer,
    TransferApprovalSerializer,
    StaffApprovalSerializer,
    ManagerPromotionDecisionSerializer,
    UserListSerializer,
    ManagerPromotionRequestReadSerializer,
    UserProfileSerializer,
    LowStockThresholdSerializer,
    WarehouseDeleteValidateSerializer,
    WarehouseDeleteConfirmSerializer,
    StaffTransferRequestSerializer,
)
from warehouses.utils.logging import get_recent_logs

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import update_last_login

# =====================================================
# AUTH
# =====================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Update last_login
        update_last_login(None, self.user)
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterAPIView(APIView):
    authentication_classes = []
    permission_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            log_error(f"Register POST Data: {request.data}")
            serializer = RegisterSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                {"message": "Registration successful"},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            import traceback
            log_error(f"Registration Error: {e}")
            log_error(traceback.format_exc())
            # Return the error to the frontend so it can display it
            return Response(str(e), status=500)


# =====================================================
# WAREHOUSES
# =====================================================
class WarehouseCreateAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = WarehouseCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        warehouse = serializer.save()
        return Response(
            {
                "id": warehouse.id,
                "name": warehouse.name,
                "location": warehouse.location,
            },
            status=status.HTTP_201_CREATED,
        )


class WarehouseListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
             with open('view_debug.log', 'a') as f:
                 f.write(f"\n[WarehouseList] User: {request.user}")
        except: pass
        
        user = request.user
        
        # 🔒 Filtering logic
        simple = request.query_params.get("simple") == "true"
        
        if simple:
            # Dropdown usage: filter by role
            if user.role.name == Role.ADMIN:
                warehouses = Warehouse.objects.filter(is_deleted=False).order_by("name")
            elif user.role.name == Role.MANAGER:
                warehouses = Warehouse.objects.filter(
                    manager__user=user, is_deleted=False
                ).order_by("name")
            else:
                # Staff/Viewer get empty list
                warehouses = Warehouse.objects.none()
            
            data = [{"id": w.id, "name": w.name} for w in warehouses]
            return Response(data)

        if user.role.name == Role.ADMIN:
            warehouses = Warehouse.objects.filter(is_deleted=False)
        elif user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user, is_deleted=False)
        else:
            warehouses = Warehouse.objects.filter(is_deleted=False)

        # 🔍 Filters
        search_query = request.query_params.get("search")
        if search_query:
            warehouses = warehouses.filter(
                models.Q(name__icontains=search_query) 
                | models.Q(location__icontains=search_query)
            )

        has_stock = request.query_params.get("has_stock")
        if has_stock == 'true':
             # Use stock_set or stocks. Assuming stock_set for now or explicit query
             warehouses = warehouses.filter(stock__quantity__gt=0).distinct()
        elif has_stock == 'false':
             warehouses = warehouses.exclude(stock__quantity__gt=0).distinct()

        has_staff_param = request.query_params.get("has_staff")
        if has_staff_param == 'true':
             warehouses = warehouses.filter(staff__isnull=False).distinct()
        elif has_staff_param == 'false':
             warehouses = warehouses.filter(staff__isnull=True)

        # 🔒 Sorting
        ordering = request.query_params.get("ordering", "name")
        allowed_ordering = ["name", "location"]
        if ordering not in allowed_ordering:
            ordering = "name"
        
        warehouses = warehouses.order_by(ordering)

        # Pagination
        paginator = StandardResultsSetPagination()
        result_page = paginator.paginate_queryset(warehouses, request)
        
        data = []
        # Use result_page if paginated, else warehouses
        # paginate_queryset returns a list if pagination is active, or None if not? 
        # Actually paginate_queryset returns the sliced queryset.
        
        source = result_page if result_page is not None else warehouses

        for w in source:
            # Calculate stats
            stocks = Stock.objects.filter(warehouse=w)
            total_qty = sum(s.quantity for s in stocks)
            
            # Use aggregation for better performance in real app, but loop is fine for small scale
            # total_value
            total_value = sum((s.quantity * s.product.price) for s in stocks if s.product.price)
            
            # Low stock
            low_count = 0
            # Optimization: Fetch thresholds once or optimize this loop? 
            # For now keeping logic same for safety.
            thresholds = {t.product_id: t.threshold_quantity for t in LowStockThreshold.objects.filter(warehouse=w)}
            
            for s in stocks:
                threshold = thresholds.get(s.product.id, 10)
                if s.quantity < threshold:
                    low_count += 1

            data.append({
                "warehouse_id": w.id,
                "name": w.name,
                "location": w.location,
                "total_quantity": total_qty,
                "total_value": round(total_value, 2),
                "low_stock_count": low_count,
                 # Include manager info for filtering
                "manager": w.manager.user.username if w.manager else None,
                "manager_id": w.manager.id if w.manager else None
            })

        if result_page is not None:
             with open('view_debug.log', 'a') as f:
                 f.write(f"\n[WarehouseList] Returning Paginated: {len(data)}")
             return paginator.get_paginated_response(data)

        with open('view_debug.log', 'a') as f:
             f.write(f"\n[WarehouseList] Returning NON-Paginated: {len(data)}")
        return Response(data)


class WarehouseDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            warehouse = Warehouse.objects.select_related("manager", "manager__user").get(pk=pk, is_deleted=False)
        except Warehouse.DoesNotExist:
            return Response({"error": "Warehouse not found"}, status=404)

        # 🔒 Permission Check
        user = request.user
        if user.role.name == Role.MANAGER:
            # Manager can only view their own warehouse
            if not warehouse.manager or warehouse.manager.user != user:
                return Response({"error": "Forbidden"}, status=403)
        elif user.role.name == Role.STAFF:
            # Staff can only view their assigned warehouse
            # (Assuming staff works at one warehouse)
            if not hasattr(user, 'staff') or user.staff.warehouse != warehouse:
                 return Response({"error": "Forbidden"}, status=403)
        
        # 1. Manager Info
        manager_data = None
        if warehouse.manager:
            manager_data = {
                "id": warehouse.manager.id,
                "username": warehouse.manager.user.username,
                "email": warehouse.manager.user.email
            }

        # 2. Staff List
        staff_list = []
        staffs = Staff.objects.filter(warehouse=warehouse).exclude(user__role__name=Role.MANAGER).select_related("user")
        for s in staffs:
            staff_list.append({
                "id": s.id,
                "user_id": s.user.id,
                "username": s.user.username,
                "email": s.user.email,
                "is_active": s.user.is_active
            })

        # 3. Stock List
        stock_list = []
        stocks = Stock.objects.filter(warehouse=warehouse).select_related("product")
        
        total_quantity = 0
        total_value = 0

        for s in stocks:
            total_quantity += s.quantity
            val = s.quantity * s.product.price
            total_value += val
            
            stock_list.append({
                "id": s.id,
                "product_name": s.product.name,
                "sku": s.product.sku,
                "quantity": s.quantity,
                "price": str(s.product.price),
                "value": str(val)
            })

        data = {
            "id": warehouse.id,
            "name": warehouse.name,
            "location": warehouse.location,
            "manager": manager_data,
            "staffs": staff_list,
            "stocks": stock_list,
            "stats": {
                "total_quantity": total_quantity,
                "total_value": str(total_value),
                "staff_count": len(staff_list)
            }
        }

        return Response(data)


# =====================================================
# PRODUCTS
# =====================================================
class ProductCreateAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            ProductReadSerializer(product).data,
            status=status.HTTP_201_CREATED,
        )


class ProductListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with open('view_debug.log', 'a') as f:
            f.write(f"\n[ProductList] User: {request.user}, Role: {getattr(request.user.role, 'name', 'None')}")

        if request.user.role.name == Role.ADMIN:
            products = Product.objects.all()
            is_active_param = request.query_params.get("is_active")
            if is_active_param:
                if is_active_param.lower() == 'true':
                    products = products.filter(is_active=True)
                elif is_active_param.lower() == 'false':
                    products = products.filter(is_active=False)
            else:
                products = products.filter(is_active=True) # Default to active even for admin unless specified
        else:
             products = Product.objects.filter(is_active=True)

        # 🔍 Search
        search_query = request.query_params.get("search")
        if search_query:
            products = products.filter(models.Q(name__icontains=search_query) | models.Q(sku__icontains=search_query))
        
        # 🔍 Filters
        has_stock = request.query_params.get("has_stock")
        if has_stock == 'true':
            products = products.filter(stocks__quantity__gt=0).distinct()
        elif has_stock == 'false':
             # Products with NO stock records OR all stock records are <= 0
             # easier: exclude those with stock > 0
             products = products.exclude(stocks__quantity__gt=0).distinct()
        
        # 🔒 Sorting
        ordering = request.query_params.get("ordering", "name")
        allowed_ordering = ["name", "price", "sku"]
        if ordering not in allowed_ordering:
            ordering = "name"
        products = products.order_by(ordering)
        
        # 🔒 Filter for Manager: Only products with stock in their warehouse
        # UNLESS ?all=true is passed (e.g. for creating new Transfer Requests)
        show_all = request.query_params.get("all") == "true"
        
        if not show_all and request.user.role and request.user.role.name == Role.MANAGER:
            try:
                manager_warehouses = Warehouse.objects.filter(manager__user=request.user)
                # Filter products that have stock in any of the manager's warehouses
                products = products.filter(stocks__warehouse__in=manager_warehouses).distinct()
            except Exception:
                pass 

        paginator = StandardResultsSetPagination()
        result_page = paginator.paginate_queryset(products, request)
        serializer = ProductReadSerializer(result_page, many=True)
        
        with open('view_debug.log', 'a') as f:
             f.write(f"\n[ProductList] Returning: {len(serializer.data)} items")
             
        return paginator.get_paginated_response(serializer.data)


class ProductUpdateAPIView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductCreateSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProductReadSerializer(product).data)


class ProductDeleteAPIView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Check for stock dependency
            assigned_stock = Stock.objects.filter(product=product, quantity__gt=0)
            
            confirm = request.query_params.get("confirm") == "true"

            if assigned_stock.exists() and not confirm:
                warehouses = assigned_stock.values_list("warehouse__name", flat=True).distinct()
                msg = f"This product is assigned to {assigned_stock.count()} warehouses ({', '.join(warehouses)}). Deleting it will hide it from lists but keep history. Are you sure?"
                return Response(
                    {
                        "confirmation_required": True,
                        "message": msg
                    },
                    status=status.HTTP_200_OK
                )

            # Soft Delete
            if hasattr(product, 'is_active'):
                 product.is_active = False
                 product.save()
                 return Response({"status": "DELETED", "message": "Product soft deleted successfully"}, status=status.HTTP_200_OK)
            else:
                 return Response({"error": "Soft delete field missing from database."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





# =====================================================
# STOCK
# =====================================================
class StockListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stocks = Stock.objects.filter(product__is_active=True).select_related("product", "warehouse")
        
        # 🔒 Filter for Manager: Only stocks in their warehouse
        if request.user.role and request.user.role.name == Role.MANAGER:
             stocks = stocks.filter(warehouse__manager__user=request.user)
             
        elif request.user.role and request.user.role.name == Role.STAFF:
             if hasattr(request.user, "staff") and request.user.staff.warehouse:
                 stocks = stocks.filter(warehouse=request.user.staff.warehouse)
             else:
                 stocks = stocks.none()

        # Filter by specific warehouse
        warehouse_id = request.query_params.get("warehouse") or request.query_params.get("warehouse_id")
        if warehouse_id:
            stocks = stocks.filter(warehouse_id=warehouse_id)

        # 🔍 Filters
        product_query = request.query_params.get("product")
        if product_query:
            if product_query.isdigit():
                 stocks = stocks.filter(product__id=product_query)
            else:
                 stocks = stocks.filter(product__name__icontains=product_query)

        min_qty = request.query_params.get("min_qty")
        if min_qty and min_qty.isdigit():
            stocks = stocks.filter(quantity__gte=int(min_qty))

        max_qty = request.query_params.get("max_qty")
        if max_qty and max_qty.isdigit():
            stocks = stocks.filter(quantity__lte=int(max_qty))
        
        low_stock = request.query_params.get("low_stock")
        if low_stock == 'true':
            # Naive low stock implementation: < 10 or 0
            stocks = stocks.filter(quantity__lte=10) 

        # 🔒 Sorting
        ordering = request.query_params.get("ordering", "product__name")
        allowed_ordering = ["product__name", "warehouse__name", "quantity", "-updated_at"]
        if ordering not in allowed_ordering:
            ordering = "product__name"
        stocks = stocks.order_by(ordering)

        paginator = StandardResultsSetPagination()
        result_page = paginator.paginate_queryset(stocks, request)
        serializer = StockReadSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StockAssignAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StockAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_warehouse_id = serializer.validated_data["warehouse_id"]

        # Permission Check
        if request.user.role.name == Role.ADMIN:
            pass # Allowed
        elif request.user.role.name == Role.MANAGER:
             # Must manage the target warehouse
             # We can query Warehouse.manager field
             # Or check if this warehouse is in their managed set
             can_manage = Warehouse.objects.filter(
                 id=target_warehouse_id, 
                 manager__user=request.user
             ).exists()
             
             if not can_manage:
                 return Response(
                     {"error": "You do not have permission to assign stock to this warehouse"}, 
                     status=status.HTTP_403_FORBIDDEN
                 )
        else:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        stock, _ = Stock.objects.get_or_create(
            product_id=serializer.validated_data["product_id"],
            warehouse_id=target_warehouse_id,
            defaults={"quantity": 0},
        )

        stock.quantity += serializer.validated_data["quantity"]
        stock.save(update_fields=["quantity"])

        return Response(
            {"status": "STOCK_ASSIGNED", "quantity": stock.quantity},
            status=status.HTTP_200_OK,
        )


# =====================================================
# PURCHASE REQUESTS
# =====================================================
class PurchaseRequestCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PurchaseRequestCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        pr = serializer.save()
        return Response(
            {"id": pr.id, "status": pr.status},
            status=status.HTTP_201_CREATED,
        )


class PurchaseApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = PurchaseApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pr = PurchaseRequest.objects.select_for_update().get(
            id=serializer.validated_data["purchase_request_id"]
        )

        if pr.status != PurchaseRequest.STATUS_PENDING:
            return Response(
                {"error": "Purchase request already processed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        warehouse = pr.warehouse

        # ---- PERMISSION LOGIC (CORRECT & FINAL) ----
        is_admin = user.role.name == Role.ADMIN

        is_manager_of_warehouse = (
            user.role.name == Role.MANAGER
            and warehouse.manager
            and warehouse.manager.user == user
        )

        is_staff_of_warehouse = (
            user.role.name == Role.STAFF
            and user.is_active
            and Staff.objects.filter(
                user=user,
                warehouse=warehouse
            ).exists()
        )

        if not (is_admin or is_manager_of_warehouse or is_staff_of_warehouse):
            return Response(
                {"error": "You do not have permission to approve this request"},
                status=status.HTTP_403_FORBIDDEN,
            )
        # --------------------------------------------

        decision = serializer.validated_data["decision"]

        if decision == "APPROVED":
            try:
                stock = Stock.objects.select_for_update().get(
                    product=pr.product,
                    warehouse=warehouse
                )
            except Stock.DoesNotExist:
                return Response(
                    {"error": "Stock record not found for this product/warehouse"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if stock.quantity < pr.quantity:
                return Response(
                    {"error": "Insufficient stock"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            stock.quantity -= pr.quantity
            stock.save(update_fields=["quantity"])

            pr.status = PurchaseRequest.STATUS_APPROVED
        else:
            pr.status = PurchaseRequest.STATUS_REJECTED

        pr.processed_by = user
        pr.processed_at = timezone.now()
        pr.save()

        PurchaseApproval.objects.create(
            purchase_request=pr,
            approver=user,
            decision=decision,
        )

        return Response({"status": pr.status}, status=status.HTTP_200_OK)



class PurchaseRequestListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name == Role.ADMIN:
            qs = PurchaseRequest.objects.all()

        elif user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user)
            qs = PurchaseRequest.objects.filter(warehouse__in=warehouses)
            try:
                with open('qs_debug.log', 'a') as f:
                    f.write(f"\n[PRList] Manager: {user.username}")
                    f.write(f"\n[PRList] Warehouses: {list(warehouses.values_list('id', flat=True))}")
                    f.write(f"\n[PRList] QS Count: {qs.count()}")
            except: pass

        elif user.role.name == Role.STAFF:
            # Allow staff to see ALL requests for their assigned warehouse
            if hasattr(user, "staff") and user.staff.warehouse:
                qs = PurchaseRequest.objects.filter(warehouse=user.staff.warehouse)
            else:
                qs = PurchaseRequest.objects.none()

        else:
            qs = PurchaseRequest.objects.filter(viewer=user)

        # 🔍 Filters
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        product_query = request.query_params.get("product")
        if product_query:
            if product_query.isdigit():
                qs = qs.filter(product__id=product_query)
            else:
                qs = qs.filter(product__name__icontains=product_query)

        warehouse_id = request.query_params.get("warehouse")
        if warehouse_id:
            qs = qs.filter(warehouse__id=warehouse_id)

        requested_by = request.query_params.get("requested_by")
        if requested_by:
             # viewer is the requester
             qs = qs.filter(viewer__id=requested_by)

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        # 🔒 Sorting
        ordering = request.query_params.get("ordering", "-id")
        allowed_ordering = ["-id", "id", "status", "product__name"]
        if ordering not in allowed_ordering:
            ordering = "-id"

        qs = qs.select_related("product", "warehouse", "viewer").order_by(ordering)
        
        try:
             with open('qs_debug.log', 'a') as f:
                 f.write(f"\n[PRList] Final QS Count: {qs.count()}")
        except: pass

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)

        data = []
        for pr in page:
            data.append(
                {
                    "id": pr.id,
                    "product": pr.product.name,
                    "warehouse": pr.warehouse.name,
                    "quantity": pr.quantity,
                    "status": pr.status,
                    "requested_by": pr.viewer.username, # Viewer IS the requester
                    "processed_at": pr.processed_at,
                    "viewer": pr.viewer.username, 
                }
            )

        return paginator.get_paginated_response(data)


# =====================================================
# TRANSFER REQUEST
# =====================================================
class TransferRequestCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransferRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        tr = TransferRequest.objects.create(
            requested_by=request.user,
            **serializer.validated_data
        )

        return Response(
            {"id": tr.id, "status": tr.status},
            status=status.HTTP_201_CREATED,
        )



class TransferApproveAPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @transaction.atomic
    def post(self, request):
        serializer = TransferApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tr = TransferRequest.objects.select_for_update().get(
            id=serializer.validated_data["transfer_request_id"]
        )

        # 🔒 Permission Check: Admin or Source Warehouse Manager
        if request.user.role.name == Role.MANAGER:
            # Check if user manages the source warehouse
            if not (tr.source_warehouse.manager and tr.source_warehouse.manager.user == request.user):
                return Response(
                    {"error": "Only the Admin or Source Warehouse Manager can approve this request"},
                    status=status.HTTP_403_FORBIDDEN
                )

        decision = serializer.validated_data["decision"]

        # Only Update if PENDING
        if tr.status != TransferRequest.STATUS_PENDING:
             return Response({"error": "Request already processed"}, status=400)

        if decision == "APPROVED":
            src = Stock.objects.select_for_update().get(
                product=tr.product,
                warehouse=tr.source_warehouse,
            )
            if src.quantity < tr.quantity:
                return Response(
                    {"error": "Insufficient stock"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            dst, _ = Stock.objects.get_or_create(
                product=tr.product,
                warehouse=tr.destination_warehouse,
                defaults={"quantity": 0},
            )

            src.quantity -= tr.quantity
            dst.quantity += tr.quantity
            src.save()
            dst.save()

            tr.status = TransferRequest.STATUS_APPROVED
        else:
            tr.status = TransferRequest.STATUS_REJECTED

        tr.approved_by = request.user
        tr.approved_at = timezone.now()
        tr.save()

        TransferApproval.objects.create(
            transfer_request=tr,
            approver=request.user,
            decision=decision,
        )

        return Response({"status": tr.status})


class TransferRequestListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name == Role.ADMIN:
            qs = TransferRequest.objects.all()

        elif user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user)
            qs = TransferRequest.objects.filter(
                models.Q(source_warehouse__in=warehouses)
                | models.Q(destination_warehouse__in=warehouses)
            )

        else:
            qs = TransferRequest.objects.none()

        # 🔍 Filters
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        from_warehouse = request.query_params.get("from_warehouse")
        if from_warehouse:
            qs = qs.filter(source_warehouse__id=from_warehouse)

        to_warehouse = request.query_params.get("to_warehouse")
        if to_warehouse:
            qs = qs.filter(destination_warehouse__id=to_warehouse)

        product_query = request.query_params.get("product")
        if product_query:
            if product_query.isdigit():
                qs = qs.filter(product__id=product_query)
            else:
                qs = qs.filter(product__name__icontains=product_query)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)

        data = []
        for tr in page:
            # Determine if this user can approve
            can_approve = False
            if user.role.name == Role.ADMIN:
                can_approve = True
            elif user.role.name == Role.MANAGER:
                # Can approve only if source manager
                if tr.source_warehouse.manager and tr.source_warehouse.manager.user == user:
                    can_approve = True

            data.append(
                {
                    "id": tr.id,
                    "product": tr.product.name,
                    "quantity": tr.quantity,
                    "status": tr.status,
                    "source_warehouse": tr.source_warehouse.name,
                    "destination_warehouse": tr.destination_warehouse.name,
                    "can_approve": can_approve,
                    "approved_at": tr.approved_at,
                }
            )

        return paginator.get_paginated_response(data)


# =====================================================
# TRANSFER REQUESTS
# =====================================================
class TransferRequestCreateAPIView(APIView):
    permission_classes = [IsManager]

    def post(self, request):
        serializer = TransferRequestCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        destination_warehouse = serializer.validated_data["destination_warehouse"]

        # ✅ ensure requester is manager of destination warehouse
        if (
            destination_warehouse.manager is None
            or destination_warehouse.manager.user != request.user
        ):
            return Response(
                {"error": "Only destination warehouse manager can request transfers"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ✅ FIX: explicitly set requested_by
        tr = TransferRequest.objects.create(
            requested_by=request.user,
            **serializer.validated_data
        )

        return Response(
            {"id": tr.id, "status": tr.status},
            status=status.HTTP_201_CREATED,
        )



class TransferApproveAPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @transaction.atomic
    def post(self, request):
        serializer = TransferApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tr = TransferRequest.objects.select_for_update().get(
            id=serializer.validated_data["transfer_request_id"]
        )

        # 🔒 Permission Check: Admin or Source Warehouse Manager
        if request.user.role.name == Role.MANAGER:
            # Check if user manages the source warehouse
            if not (tr.source_warehouse.manager and tr.source_warehouse.manager.user == request.user):
                return Response(
                    {"error": "Only the Admin or Source Warehouse Manager can approve this request"},
                    status=status.HTTP_403_FORBIDDEN
                )

        decision = serializer.validated_data["decision"]

        if decision == "APPROVED":
            src = Stock.objects.select_for_update().get(
                product=tr.product,
                warehouse=tr.source_warehouse,
            )
            if src.quantity < tr.quantity:
                return Response(
                    {"error": "Insufficient stock"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            dst, _ = Stock.objects.get_or_create(
                product=tr.product,
                warehouse=tr.destination_warehouse,
                defaults={"quantity": 0},
            )

            src.quantity -= tr.quantity
            dst.quantity += tr.quantity
            src.save()
            dst.save()

            tr.status = TransferRequest.STATUS_APPROVED
            tr.approved_by = request.user  # Record approver
            tr.approved_at = timezone.now()
        else:
            tr.status = TransferRequest.STATUS_REJECTED
            tr.approved_by = request.user # Record rejecter
            tr.approved_at = timezone.now()

        tr.save()

        TransferApproval.objects.create(
            transfer_request=tr,
            approver=request.user,
            decision=decision,
        )

        return Response({"status": tr.status})


class TransferRequestListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name == Role.ADMIN:
            qs = TransferRequest.objects.all()

        elif user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user)
            qs = TransferRequest.objects.filter(
                models.Q(source_warehouse__in=warehouses)
                | models.Q(destination_warehouse__in=warehouses)
            )

        else:
            qs = TransferRequest.objects.none()

        data = []
        for tr in qs.select_related("product", "source_warehouse", "destination_warehouse"):
            # Determine if this user can approve
            can_approve = False
            if user.role.name == Role.ADMIN:
                can_approve = True
            elif user.role.name == Role.MANAGER:
                # Can approve only if source manager
                if tr.source_warehouse.manager and tr.source_warehouse.manager.user == user:
                    can_approve = True

            data.append(
                {
                    "id": tr.id,
                    "product": tr.product.name,
                    "quantity": tr.quantity,
                    "status": tr.status,
                    "source_warehouse": tr.source_warehouse.name,
                    "destination_warehouse": tr.destination_warehouse.name,
                    "can_approve": can_approve
                }
            )

        return Response(data)


# =====================================================
# STAFF APPROVAL
# =====================================================
class StaffApproveAPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request):
        log_error(f"StaffApprove POST called by {request.user.username} Data: {request.data}")
        serializer = StaffApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        staff_id = data.get("staff_id")
        user_id = data.get("user_id")
        warehouse_id = data["warehouse_id"]  # required field

        # -------------------------------------------------
        # Resolve Staff (safe handling)
        # -------------------------------------------------
        if staff_id:
            try:
                staff = Staff.objects.select_related("user").get(id=staff_id)
            except Staff.DoesNotExist:
                return Response({"error": "Staff not found"}, status=404)

        elif user_id:
            try:
                staff = Staff.objects.select_related("user").get(user_id=user_id)
            except Staff.DoesNotExist:
                return Response(
                    {"error": "Staff mapping not found for given user_id"},
                    status=404
                )
        else:
            return Response(
                {"error": "Either staff_id or user_id is required"},
                status=400
            )

        # -------------------------------------------------
        # Resolve Warehouse
        # -------------------------------------------------
        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "Warehouse not found"}, status=404)

        # -------------------------------------------------
        # Business validations
        # -------------------------------------------------
        if staff.user.is_active:
            return Response({"error": "Already approved"}, status=400)

        if request.user.role.name == Role.MANAGER:
            if not warehouse.manager or warehouse.manager.user != request.user:
                return Response({"error": "Not your warehouse"}, status=403)

        # -------------------------------------------------
        # Approve staff
        # -------------------------------------------------
        staff.warehouse = warehouse
        staff.user.is_active = True
        staff.user.save(update_fields=["is_active"])
        staff.save(update_fields=["warehouse"])

        StaffApproval.objects.get_or_create(
            staff=staff,
            defaults={"approved_by": request.user},
        )

        return Response(
            {
                "status": "STAFF_APPROVED",
                "staff_id": staff.id,
                "user_id": staff.user.id,
                "warehouse_id": warehouse.id,
            },
            status=status.HTTP_200_OK
        )


# =====================================================
# MANAGER PROMOTION (MANAGER → ADMIN)
# =====================================================
class ManagerPromotionRequestAPIView(APIView):
    permission_classes = [IsManager]

    def post(self, request):
        staff = Staff.objects.get(id=request.data["staff_id"])

        if staff.warehouse.manager.user != request.user:
            return Response(
                {"error": "Not your staff"},
                status=status.HTTP_403_FORBIDDEN,
            )

        ManagerPromotionRequest.objects.get_or_create(
            staff=staff,
            defaults={"requested_by": request.user},
        )

        return Response({"status": "REQUEST_CREATED"})


class ManagerPromotionApproveAPIView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request):
        decision = request.data.get("decision")
        promotion_request_id = request.data.get("promotion_request_id")
        staff_id = request.data.get("staff_id")
        user_id = request.data.get("user_id")
        warehouse_id = request.data.get("warehouse_id")

        if not warehouse_id:
            return Response({"error": "warehouse_id is required"}, status=400)

        pr = None  # IMPORTANT: always define
        staff = None
        user = None

        # =================================================
        # MODE 1: Admin approves a promotion request
        # =================================================
        if promotion_request_id is not None:
            if not decision:
                return Response(
                    {"error": "decision is required for promotion requests"},
                    status=400,
                )

            try:
                pr = ManagerPromotionRequest.objects.select_for_update().get(
                    id=promotion_request_id,
                    status=ManagerPromotionRequest.STATUS_PENDING,
                )
            except ManagerPromotionRequest.DoesNotExist:
                return Response({"error": "Invalid promotion request"}, status=404)

            staff = pr.staff
            user = staff.user

            if decision == "REJECTED":
                pr.status = ManagerPromotionRequest.STATUS_REJECTED
                pr.approved_by = request.user
                pr.approved_at = timezone.now()
                pr.save()
                return Response({"status": "REJECTED"}, status=200)

        # =================================================
        # MODE 2: Direct admin promotion / assignment
        # =================================================
        else:
            if not (staff_id or user_id):
                return Response(
                    {"error": "staff_id or user_id is required for direct promotion"},
                    status=400,
                )

            if staff_id:
                try:
                    staff = Staff.objects.select_for_update().get(id=staff_id)
                    user = staff.user
                except Staff.DoesNotExist:
                    return Response({"error": "Staff not found"}, status=404)
            else:
                try:
                    user = User.objects.select_for_update().get(id=user_id)
                except User.DoesNotExist:
                    return Response({"error": "User not found"}, status=404)

        # =================================================
        # FINAL: assign / promote / reuse manager
        # =================================================
        if not warehouse_id:
            return Response({"error": "warehouse_id is required for approval"}, status=400)

        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "Warehouse not found"}, status=404)

        # User already a manager → reuse (ALLOW MULTIPLE WAREHOUSES)
        if user.role.name == Role.MANAGER:
            manager = Manager.objects.get(user=user)
        else:
            user.role = Role.objects.get(name=Role.MANAGER)
            user.is_active = True
            user.save(update_fields=["role", "is_active"])
            
            # Soft delete from Staff list: Unassign warehouse
            Staff.objects.filter(user=user).update(warehouse=None)
            
            manager = Manager.objects.create(user=user)

        warehouse.manager = manager
        warehouse.save(update_fields=["manager"])

        if pr:
            pr.status = ManagerPromotionRequest.STATUS_APPROVED
            pr.approved_by = request.user
            pr.approved_at = timezone.now()
            pr.save()

        return Response(
            {
                "status": "PROMOTED_TO_MANAGER",
                "user_id": user.id,
                "manager_id": manager.id,
                "warehouse_id": warehouse.id,
            },
            status=200,
        )




# =====================================================
# USERS LIST
# =====================================================
class UserListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name not in [Role.ADMIN, Role.MANAGER]:
            return Response({"error": "Forbidden"}, status=403)

        users = User.objects.select_related("role").all()

        if user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user)
            staff_ids = Staff.objects.filter(
                warehouse__in=warehouses
            ).values_list("user_id", flat=True)

            users = users.filter(
                models.Q(role__name=Role.VIEWER)
                | models.Q(id__in=staff_ids)
            ).exclude(role__name=Role.MANAGER) # Explicitly exclude other managers

        # 🔒 Filter by Role (if requested)
        # This fixes pagination issues by filtering at DB level
        role_filter = request.query_params.get("role")
        if role_filter:
            users = users.filter(role__name=role_filter)

        # 🔍 Filters
        approved_param = request.query_params.get("approved") or request.query_params.get("is_active")
        if approved_param:
            is_active = approved_param.lower() == 'true'
            users = users.filter(is_active=is_active)

        warehouse_param = request.query_params.get("warehouse")
        if warehouse_param:
            users = users.filter(
                models.Q(staff__warehouse__id=warehouse_param)
                | models.Q(manager__warehouses__id=warehouse_param)
            ).distinct()

        # 🔒 Sorting
        ordering = request.query_params.get("ordering", "username")
        allowed_ordering = ["username", "email", "role__name", "-date_joined"]
        if ordering not in allowed_ordering:
            ordering = "username"
        users = users.order_by(ordering)

        users = users.select_related("role", "staff__warehouse", "manager").prefetch_related("manager__warehouses")

        paginator = StandardResultsSetPagination()
        page_users = paginator.paginate_queryset(users, request)

        data = []
        for u in page_users:
            # Profile Fields
            try:
                profile = u.profile
                full_name = profile.full_name
                phone_number = profile.phone_number
            except Exception:
                full_name = None
                phone_number = None

            # Warehouse Info
            assigned_warehouse = None
            managed_warehouses = []
            
            if u.role.name == Role.STAFF and hasattr(u, "staff"):
                if u.staff.warehouse:
                    assigned_warehouse = {
                        "id": u.staff.warehouse.id,
                        "name": u.staff.warehouse.name,
                        "manager": u.staff.warehouse.manager.user.username if u.staff.warehouse.manager else None
                    }
            
            if u.role.name == Role.MANAGER and hasattr(u, "manager"):
                managed = u.manager.warehouses.all()
                managed_warehouses = [{"id": w.id, "name": w.name} for w in managed]

            viewer_id = (
                Viewer.objects.filter(user=u)
                .values_list("id", flat=True)
                .first()
            )

            staff_id = u.staff.id if hasattr(u, "staff") else None
            manager_id = u.manager.id if hasattr(u, "manager") else None

            data.append({
                "user_id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role.name,
                "is_active": u.is_active,
                "status": "APPROVED" if u.is_active else "PENDING",
                "viewer_id": viewer_id,
                "staff_id": staff_id,
                "manager_id": manager_id,
                "full_name": full_name,
                "phone_number": phone_number,
                "assigned_warehouse": assigned_warehouse,
                "managed_warehouses": managed_warehouses
            })

        return paginator.get_paginated_response(data)


class ManagerPromotionRequestListAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = (
            ManagerPromotionRequest.objects
            .select_related("staff__user", "requested_by")
            .order_by("-id")
        )

        # 🔍 Filters
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        warehouse_param = request.query_params.get("warehouse")
        if warehouse_param:
            qs = qs.filter(staff__warehouse__id=warehouse_param)

        requested_by = request.query_params.get("requested_by")
        if requested_by:
            qs = qs.filter(requested_by__id=requested_by)

        paginator = StandardResultsSetPagination()
        result_page = paginator.paginate_queryset(qs, request)
        serializer = ManagerPromotionRequestReadSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminDemoteManagerAPIView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request):
        """
        Demote a MANAGER back to STAFF.
        Body:
        {
            "user_id": <manager_user_id>
        }
        """

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id required"}, status=400)

        try:
            user = User.objects.select_for_update().get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user.role.name != Role.MANAGER:
            return Response({"error": "User is not a manager"}, status=400)

        # Remove warehouse manager assignment
        Warehouse.objects.filter(manager__user=user).update(manager=None)

        # Change role
        user.role = Role.objects.get(name=Role.STAFF)
        user.is_active = False
        user.save(update_fields=["role", "is_active"])

        # Ensure Staff mapping exists
        Staff.objects.get_or_create(user=user)

        return Response(
            {"status": "MANAGER_DEMOTED_TO_STAFF"},
            status=status.HTTP_200_OK
        )


class StaffDismissAPIView(APIView):
    permission_classes = [IsAdmin | IsManager]

    @transaction.atomic
    def post(self, request):
        """
        Dismiss a staff member.
        Body:
        {
            "staff_id": <staff_id>
        }
        """

        staff_id = request.data.get("staff_id")
        if not staff_id:
            return Response({"error": "staff_id required"}, status=400)

        try:
            staff = Staff.objects.select_for_update().get(id=staff_id)
        except Staff.DoesNotExist:
            return Response({"error": "Staff not found"}, status=404)

        # MANAGER restriction
        if request.user.role.name == Role.MANAGER:
            if not staff.warehouse or staff.warehouse.manager.user != request.user:
                return Response(
                    {"error": "Not authorized to dismiss this staff"},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Soft dismissal
        staff.user.is_active = False
        staff.user.save(update_fields=["is_active"])

        staff.warehouse = None
        staff.save(update_fields=["warehouse"])

        return Response(
            {"status": "STAFF_DISMISSED"},
            status=status.HTTP_200_OK
        )


class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        target_user = request.user
        user_id = request.query_params.get("user_id")

        # Allow Admin OR Manager to view other profiles
        if user_id and request.user.role and request.user.role.name in [Role.ADMIN, Role.MANAGER]:
            try:
                target_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

        profile, _ = UserProfile.objects.get_or_create(user=target_user)

        profile_data = UserProfileSerializer(
            profile,
            context={"request": request}
        ).data

        user_data = {
            "id": target_user.id,
            "username": target_user.username,
            "email": target_user.email,
            "role": target_user.role.name if target_user.role else None,
            "is_active": target_user.is_active,
            "last_login": target_user.last_login,
        }

        # Add assigned warehouses if Manager or Staff
        if target_user.role:
            if target_user.role.name == Role.MANAGER:
                 try:
                     manager_profile = target_user.manager
                     assigned = Warehouse.objects.filter(manager=manager_profile).values("id", "name")
                     user_data["assigned_warehouses"] = list(assigned)
                 except (Manager.DoesNotExist, AttributeError):
                     user_data["assigned_warehouses"] = []
            elif target_user.role.name == Role.STAFF:
                 try:
                     staff_profile = target_user.staff
                     if staff_profile.warehouse:
                         user_data["assigned_warehouses"] = [{"id": staff_profile.warehouse.id, "name": staff_profile.warehouse.name}]
                     else:
                         user_data["assigned_warehouses"] = []
                 except (Staff.DoesNotExist, AttributeError):
                     user_data["assigned_warehouses"] = []
            else:
                 user_data["assigned_warehouses"] = []

        return Response({
            "user": user_data,
            "profile": profile_data
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        # ✅ Create or update profile (partial update)
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )
        
        # 🟢 Handle Email Update
        new_email = request.data.get("email")
        if new_email and new_email != request.user.email:
            # Check if email already exists
            if User.objects.filter(email=new_email).exclude(id=request.user.id).exists():
                 return Response({"error": "Email already in use"}, status=400)
            
            request.user.email = new_email
            request.user.save(update_fields=["email"])

        serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True,   # 🔥 key line
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        # ✅ Delete only profile image (not profile)
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )

        if profile.profile_image:
            profile.profile_image.delete(save=True)

        return Response(
            {"status": "PROFILE_IMAGE_DELETED"},
            status=status.HTTP_200_OK
        )


# ------------------------------------------------------------------------
# DASHBOARDS
# ------------------------------------------------------------------------


class MovementEventSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()
    event_type = serializers.CharField()        # PURCHASE_APPROVAL / TRANSFER_IN / TRANSFER_OUT / STOCK_ASSIGN
    timestamp = serializers.DateTimeField()
    product = serializers.CharField()
    quantity = serializers.IntegerField()
    quantity_change = serializers.IntegerField()  # + or - quantity
    source_warehouse = serializers.CharField(allow_null=True)
    destination_warehouse = serializers.CharField(allow_null=True)
    performed_by = serializers.CharField(allow_null=True)
    raw = serializers.DictField()  # optional raw data for debugging


def _get_datetime_from(obj, candidates):
    """
    Helper: try several attribute names on obj (or related obj) and return first
    non-None datetime. candidates is list of attr names e.g. ["created_at","processed_at","timestamp"].
    """
    for name in candidates:
        val = getattr(obj, name, None)
        if val:
            return val
    return None


def _safe_getattr(obj, attr, default=None):
    try:
        return getattr(obj, attr, default)
    except Exception:
        return default


class AdminDashboardAPIView(APIView):
    """
    GET /api/dashboard/admin/

    Permissions: ADMIN only.

    Returns:
    - overall_stock_trends: labels (dates) + net_changes list (incoming - outgoing) per day (daily granularity)
    - warehouse_comparison: list of warehouses with total_quantity, total_value (if product.price exists), low_stock_count
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        # date range: optional query params ?days=30 or start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        days = int(request.query_params.get("days", 30))
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date).date()
                end = datetime.fromisoformat(end_date).date()
            except Exception:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)
        else:
            end = datetime.utcnow().date()
            start = end - timedelta(days=days - 1)

        # build date labels (daily)
        delta = (end - start).days + 1
        labels = [(start + timedelta(days=i)).isoformat() for i in range(delta)]
        net_by_date = {label: 0 for label in labels}

        # ---- collect incoming/outgoing from approvals ----
        # PURCHASE_APPROVAL (approved) => outgoing from warehouse (negative)
        try:
            purchase_approvals = PurchaseApproval.objects.select_related("purchase_request", "approver").all()
        except Exception:
            purchase_approvals = []

        for pa in purchase_approvals:
            # find timestamp
            ts = _get_datetime_from(pa, ["created_at"]) or _get_datetime_from(pa.purchase_request, ["processed_at", "created_at"])
            if ts is None:
                continue
            ts_date = ts.date().isoformat()
            if ts_date < labels[0] or ts_date > labels[-1]:
                continue
            # treat approved as outgoing, else ignore
            try:
                decision = _safe_getattr(pa, "decision", None) or _safe_getattr(pa, "purchase_request", None) and _safe_getattr(pa.purchase_request, "status", None)
            except Exception:
                decision = None
            # only consider APPROVED as outgoing
            if decision and str(decision).upper().startswith("APPROV"):
                qty = int(_safe_getattr(pa.purchase_request, "quantity", 0) or 0)
                net_by_date[ts_date] -= qty

        # TRANSFER_APPROVAL (approved) => outgoing at source (-) and incoming at destination (+)
        try:
            transfer_approvals = TransferApproval.objects.select_related("transfer_request", "approver").all()
        except Exception:
            transfer_approvals = []

        for ta in transfer_approvals:
            ts = _get_datetime_from(ta, ["created_at"]) or _get_datetime_from(ta.transfer_request, ["processed_at", "created_at"])
            if ts is None:
                continue
            ts_date = ts.date().isoformat()
            if ts_date < labels[0] or ts_date > labels[-1]:
                continue
            # only APPROVED
            try:
                decision = _safe_getattr(ta, "decision", None) or _safe_getattr(ta.transfer_request, "status", None)
            except Exception:
                decision = None
            if decision and str(decision).upper().startswith("APPROV"):
                qty = int(_safe_getattr(ta.transfer_request, "quantity", 0) or 0)
                # outgoing
                net_by_date[ts_date] -= qty
                # incoming
                net_by_date[ts_date] += qty  # net change cancels out globally, but this shows transfer movement;
                # depending on your definition net change could ignore internal transfers - keep both for transparency

        # prepare net_changes array in label order
        net_changes = [net_by_date[label] for label in labels]

        # ---- warehouse comparison ----
        warehouses = Warehouse.objects.filter(is_deleted=False).select_related("manager").all()
        warehouse_list = []
        for w in warehouses:
            stocks = Stock.objects.filter(warehouse=w).select_related("product")
            total_qty = 0
            total_value = 0
            low_count = 0
            for s in stocks:
                q = int(getattr(s, "quantity", 0) or 0)
                total_qty += q
                price = getattr(s.product, "price", None)
                if price is not None:
                    try:
                        total_value += q * float(price)
                    except Exception:
                        total_value += 0
                # threshold: prefer per-stock min_required_quantity if present, else default 10
                threshold = getattr(s, "min_required_quantity", None)
                if threshold is None:
                    threshold = getattr(s, "threshold", None)
                if threshold is None:
                    threshold = int(request.query_params.get("default_threshold", 10))
                if q <= int(threshold):
                    low_count += 1

            warehouse_list.append({
                "warehouse_id": w.id,
                "name": w.name,
                "total_quantity": total_qty,
                "total_value": int(total_value),
                "low_stock_count": low_count,
                "manager": getattr(w.manager, "user_id", None) if getattr(w, "manager", None) else None,
            })

        # sort by highest stock first (requirement)
        warehouse_list.sort(key=lambda x: x["total_quantity"], reverse=True)

        # ---- collect logs (global) with pagination and ordering ----
        # Get pagination params
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        # Strict page_size enforcement: honor request but cap at 100, minimum 1
        page_size = max(1, min(page_size, 100))
        
        # Validate page number (must be >= 1)
        page = max(1, page)
        
        # Get ordering param (default: -timestamp for newest first)
        ordering = request.GET.get('ordering', '-timestamp')
        
        # Fetch logs with larger limit for sorting/filtering
        all_logs = get_recent_logs(user=request.user, warehouse_id=None, limit=1000)
        
        # Apply ordering with deterministic secondary sort (event_id)
        # This ensures events with identical timestamps always appear in the same order
        if ordering == 'timestamp':
            all_logs.sort(key=lambda x: (x.get('timestamp') or x.get('raw_date'), x.get('event_id', 0)))
        elif ordering == '-timestamp':
            all_logs.sort(key=lambda x: (x.get('timestamp') or x.get('raw_date'), x.get('event_id', 0)), reverse=True)
        elif ordering == 'performed_by':
            all_logs.sort(key=lambda x: (x.get('performed_by', '').lower(), x.get('event_id', 0)))
        elif ordering == '-performed_by':
            all_logs.sort(key=lambda x: (x.get('performed_by', '').lower(), x.get('event_id', 0)), reverse=True)
        elif ordering == 'event_type':
            all_logs.sort(key=lambda x: (x.get('event_type', '').lower(), x.get('event_id', 0)))
        elif ordering == '-event_type':
            all_logs.sort(key=lambda x: (x.get('event_type', '').lower(), x.get('event_id', 0)), reverse=True)
        else:
            # Fallback to default if invalid ordering parameter
            all_logs.sort(key=lambda x: (x.get('timestamp') or x.get('raw_date'), x.get('event_id', 0)), reverse=True)
        
        # Calculate pagination
        total_count = len(all_logs)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # Handle out-of-bounds page requests gracefully
        if start_idx >= total_count and total_count > 0:
            # Requested page is beyond available data, return empty results
            # Frontend will handle this by resetting to page 1
            paginated_logs = []
        else:
            paginated_logs = all_logs[start_idx:end_idx]
        
        movement_history = {
            "results": paginated_logs,
            "count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size if page_size > 0 else 0
        }

        # ---- AGGREGATED STATS FOR KPIs ----
        # Total warehouses (active)
        total_warehouses = Warehouse.objects.filter(is_deleted=False).count()
        
        # Total products (active)
        total_products = Product.objects.filter(is_active=True).count()
        
        # Total stock units (sum of all quantities)
        from django.db.models import Sum
        total_stock_units = Stock.objects.aggregate(total=Sum('quantity'))['total'] or 0
        
        # Low stock count and items (global)
        low_stock_count = 0
        low_stock_items_list = []
        all_stocks = Stock.objects.filter(product__is_active=True).select_related('product', 'warehouse')
        thresholds_map = {}
        for threshold in LowStockThreshold.objects.all():
            key = (threshold.warehouse_id, threshold.product_id)
            thresholds_map[key] = threshold.threshold_quantity
        
        for stock in all_stocks:
            key = (stock.warehouse_id, stock.product_id)
            threshold = thresholds_map.get(key, 10)  # default 10
            if stock.quantity < threshold:
                low_stock_count += 1
                # Add to list for widget display (limit to top 10)
                if len(low_stock_items_list) < 10:
                    low_stock_items_list.append({
                        "stock_id": stock.id,
                        "product": stock.product.name,
                        "product_id": stock.product_id,
                        "warehouse": stock.warehouse.name,
                        "warehouse_id": stock.warehouse_id,
                        "quantity": stock.quantity,
                        "threshold": threshold,
                        "status": "low"
                    })
        
        # Recent purchase requests (latest 10 regardless of status)
        recent_purchases_qs = PurchaseRequest.objects.select_related(
            'product', 'warehouse', 'viewer'
        ).order_by('-created_at')[:10]
        
        pending_purchase_requests = PurchaseRequest.objects.filter(
            status=PurchaseRequest.STATUS_PENDING
        ).count()
        
        recent_purchase_requests_list = []
        for pr in recent_purchases_qs:
            recent_purchase_requests_list.append({
                "id": pr.id,
                "product": pr.product.name,
                "product_id": pr.product_id,
                "warehouse": pr.warehouse.name if pr.warehouse else "N/A",
                "warehouse_id": pr.warehouse_id if pr.warehouse else None,
                "quantity": pr.quantity,
                "requested_by": pr.viewer.username if pr.viewer else "Unknown",
                "requested_by_id": pr.viewer_id,
                "status": pr.status,
                "created_at": pr.created_at.isoformat() if pr.created_at else None
            })
        
        # Pending transfer requests
        pending_transfer_requests = TransferRequest.objects.filter(
            status=TransferRequest.STATUS_PENDING
        ).count()

        # Calculate Active Scope metrics (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)

        
        # Stock movements (in/out)
        # Using Approved Purchase Requests as proxy for Stock In since StockMovement doesn't exist
        stock_in = PurchaseRequest.objects.filter(
             created_at__gte=thirty_days_ago,
             status=PurchaseRequest.STATUS_APPROVED
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        stock_out = 0  # No sales/order model yet
        
        # Transfer movements (in/out based on completed transfers)
        transfers_in = TransferRequest.objects.filter(
            created_at__gte=thirty_days_ago,
            status=TransferRequest.STATUS_APPROVED
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        transfers_out = transfers_in  # For global view, transfers in = transfers out

        data = {
            "stats": {
                "total_warehouses": total_warehouses,
                "total_products": total_products,
                "total_stock_units": total_stock_units,
                "low_stock_count": low_stock_count,
                "pending_purchase_requests": pending_purchase_requests,
                "pending_transfer_requests": pending_transfer_requests,
            },
            "active_scope": {
                "stock_in": stock_in,
                "stock_out": stock_out,
                "transfers_in": transfers_in,
                "transfers_out": transfers_out,
            },
            "low_stock_items": low_stock_items_list,
            "recent_purchase_requests": recent_purchase_requests_list,
            "overall_stock_trends": {
                "labels": labels,
                "net_changes": net_changes
            },
            "warehouse_comparison": warehouse_list,
            "movement_history": movement_history,
        }

        return Response(data)


class WarehouseDashboardAPIView(APIView):
    """
    POST /api/dashboard/warehouse/
    Body JSON (required): {"warehouse_id": <int>, "page": <int>, "page_size": <int>}
    Permissions:
      - Admin: can view any warehouse
      - Manager: only if manager of that warehouse
      - Staff: only if staff assigned to that warehouse
    Returns:
      - movement_history (paginated, newest first)
      - low_stock_alerts
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        warehouse_id = data.get("warehouse_id")
        if not warehouse_id:
            return Response({"error": "warehouse_id required in JSON body"}, status=400)

        # permission checks
        user = request.user
        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "warehouse not found"}, status=404)

        if user.role.name == Role.ADMIN:
            pass
        elif user.role.name == Role.MANAGER:
            if not warehouse.manager or warehouse.manager.user != user:
                return Response({"error": "Not authorized for this warehouse"}, status=403)
        elif user.role.name == Role.STAFF:
            # verify staff assigned to warehouse
            staff_qs = Staff.objects.filter(user=user, warehouse=warehouse)
            if not staff_qs.exists():
                return Response({"error": "Not authorized for this warehouse"}, status=403)
        else:
            return Response({"error": "Forbidden"}, status=403)

        # Use shared utility
        # pagination and ordering
        page = int(data.get("page", 1))
        page_size = int(data.get("page_size", 20))
        page_size = min(page_size, 100)  # Max 100 per page
        
        # Get ordering param (default: -timestamp for newest first)
        ordering = request.GET.get('ordering', '-timestamp')
        
        # Fetch logs for this warehouse
        events = get_recent_logs(user=user, warehouse_id=warehouse.id, limit=1000)
        
        # Apply ordering
        if ordering == 'timestamp':
            events.sort(key=lambda x: (x.get('timestamp') or x.get('raw_date'), x.get('event_id', 0)))
        elif ordering == '-timestamp':
            events.sort(key=lambda x: (x.get('timestamp') or x.get('raw_date'), x.get('event_id', 0)), reverse=True)
        elif ordering == 'performed_by':
            events.sort(key=lambda x: (x.get('performed_by', '').lower(), x.get('event_id', 0)))
        elif ordering == '-performed_by':
            events.sort(key=lambda x: (x.get('performed_by', '').lower(), x.get('event_id', 0)), reverse=True)
        elif ordering == 'event_type':
            events.sort(key=lambda x: (x.get('event_type', '').lower(), x.get('event_id', 0)))
        elif ordering == '-event_type':
            events.sort(key=lambda x: (x.get('event_type', '').lower(), x.get('event_id', 0)), reverse=True)
        
        # Manual pagination on the list
        paginator = Paginator(events, page_size)
        try:
            page_obj = paginator.page(page)
        except Exception:
            page_obj = paginator.page(1)
            
        # We need to serialize if get_recent_logs returns dicts? 
        # get_recent_logs returns list of dicts. 
        # MovementEventSerializer expects dicts matching fields.
        # But wait, get_recent_logs returns dicts already formatted.
        # We can just return them directly or pass through serializer validation?
        # Serializer adds validation but for read-only it's just keys.
        # Let's return the results directly as they are already dicts. 
        # But check if frontend expects specific keys.
        # Existing serializer `MovementEventSerializer` might transpose keys?
        # Based on previous code, it just returned the dicts.

        # low stock alerts and items
        stocks = Stock.objects.filter(warehouse=warehouse).select_related("product")
        low_alerts = []
        total_stock_units = 0
        low_stock_count = 0
        
        # Build threshold map for this warehouse
        thresholds_map = {}
        for threshold in LowStockThreshold.objects.filter(warehouse=warehouse):
            thresholds_map[threshold.product_id] = threshold.threshold_quantity
        
        for s in stocks:
            q = int(getattr(s, "quantity", 0) or 0)
            total_stock_units += q
            
            threshold = thresholds_map.get(s.product_id, 10)  # default 10
            
            if q < threshold:
                low_stock_count += 1
                low_alerts.append({
                    "stock_id": s.id,
                    "product": _safe_getattr(s.product, "name", str(_safe_getattr(s, "product", ""))),
                    "product_id": s.product_id,
                    "warehouse": warehouse.name,
                    "warehouse_id": warehouse.id,
                    "quantity": q,
                    "threshold": int(threshold),
                    "status": "low"
                })

        # Count unique products in this warehouse
        total_products = stocks.values('product').distinct().count()
        
        # Recent purchase requests (latest 10 regardless of status)
        recent_purchases_qs = PurchaseRequest.objects.filter(
            warehouse=warehouse
        ).select_related('product', 'viewer').order_by('-created_at')[:10]
        
        pending_purchase_requests = PurchaseRequest.objects.filter(
            warehouse=warehouse,
            status=PurchaseRequest.STATUS_PENDING
        ).count()
        
        recent_purchase_requests_list = []
        for pr in recent_purchases_qs:
            recent_purchase_requests_list.append({
                "id": pr.id,
                "product": pr.product.name,
                "product_id": pr.product_id,
                "warehouse": warehouse.name,
                "warehouse_id": warehouse.id,
                "quantity": pr.quantity,
                "requested_by": pr.viewer.username if pr.viewer else "Unknown",
                "requested_by_id": pr.viewer_id,
                "status": pr.status,
                "created_at": pr.created_at.isoformat() if pr.created_at else None
            })
        
        # Pending transfer requests (in or out)
        from django.db.models import Q
        pending_transfer_requests = TransferRequest.objects.filter(
            Q(source_warehouse=warehouse) | Q(destination_warehouse=warehouse),
            status=TransferRequest.STATUS_PENDING
        ).count()

        # Calculate Active Scope metrics for this warehouse (last 30 days)
        from datetime import timedelta
        from django.utils import timezone
        from django.db.models import Sum
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Stock movements (in/out) for this warehouse
        # Using Approved Purchase Requests as proxy for Stock In since StockMovement doesn't exist
        stock_in = PurchaseRequest.objects.filter(
            warehouse=warehouse,
            created_at__gte=thirty_days_ago,
            status=PurchaseRequest.STATUS_APPROVED
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        stock_out = 0  # No sales/order model yet
        
        # Transfer movements (in/out) for this warehouse
        transfers_in = TransferRequest.objects.filter(
            destination_warehouse=warehouse,
            created_at__gte=thirty_days_ago,
            status=TransferRequest.STATUS_APPROVED
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        transfers_out = TransferRequest.objects.filter(
            source_warehouse=warehouse,
            created_at__gte=thirty_days_ago,
            status=TransferRequest.STATUS_APPROVED
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return Response({
            "stats": {
                "total_products": total_products,
                "total_stock_units": total_stock_units,
                "low_stock_count": low_stock_count,
                "pending_purchase_requests": pending_purchase_requests,
                "pending_transfer_requests": pending_transfer_requests,
            },
            "active_scope": {
                "stock_in": stock_in,
                "stock_out": stock_out,
                "transfers_in": transfers_in,
                "transfers_out": transfers_out,
            },
            "low_stock_items": low_alerts,  # Use same field name as AdminDashboard
            "recent_purchase_requests": recent_purchase_requests_list,
            "movement_history": {
                "page": page,
                "page_size": page_size,
                "total_pages": paginator.num_pages,
                "total_items": paginator.count,
                "results": page_obj.object_list, # already list of dicts
            },
            "low_stock_alerts": low_alerts,  # Keep for backward compat
        }, status=status.HTTP_200_OK)




class StockMovementReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name not in [Role.ADMIN, Role.MANAGER]:
            return Response({"error": "Forbidden"}, status=403)

        warehouse_id = request.query_params.get("warehouse_id")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if not all([start_date, end_date]):
            return Response(
                {"error": "start_date and end_date are required"},
                status=400,
            )

        start_date = parse_date(start_date)
        end_date = parse_date(end_date)

        if not start_date or not end_date:
            return Response({"error": "Invalid date format"}, status=400)

        # ----------------------------------
        # Determine warehouses to include
        # ----------------------------------
        if user.role.name == Role.ADMIN:
            if warehouse_id:
                try:
                    warehouses = [Warehouse.objects.get(id=warehouse_id)]
                except Warehouse.DoesNotExist:
                    return Response({"error": "Warehouse not found"}, status=404)
            else:
                warehouses = Warehouse.objects.all()
        else:
            # MANAGER (single warehouse only)
            if not warehouse_id:
                return Response(
                    {"error": "warehouse_id is required for managers"},
                    status=400,
                )

            try:
                warehouse = Warehouse.objects.get(id=warehouse_id)
            except Warehouse.DoesNotExist:
                return Response({"error": "Warehouse not found"}, status=404)

            if warehouse.manager.user != user:
                return Response({"error": "Not your warehouse"}, status=403)

            warehouses = [warehouse]

        # ----------------------------------
        # Collect movements
        # ----------------------------------
        movements = []

        # Parse dates to full datetime range for safer filtering
        # Convert date objects to full datetime range for safer filtering
        # Convert date objects to full datetime range for safer filtering
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())

        # Purchases (outgoing)
        purchases = PurchaseApproval.objects.filter(
            purchase_request__warehouse__in=warehouses,
            purchase_request__processed_at__range=(start_dt, end_dt),
            decision="APPROVED",
        ).select_related(
            "purchase_request__product",
            "purchase_request__warehouse",
            "approver",
        )

        for p in purchases:
            pr = p.purchase_request
            p_date = pr.processed_at.strftime("%Y-%m-%d %H:%M") if pr.processed_at else "N/A"
            movements.append({
                "date": p_date,
                "product": pr.product.name,
                "quantity": -pr.quantity,
                "source": pr.warehouse.name,
                "destination": "Customer",
                "performed_by": p.approver.username,
            })

        # Transfers
        transfers = TransferApproval.objects.filter(
            transfer_request__status="APPROVED",
            transfer_request__created_at__range=(start_dt, end_dt),
        ).filter(
            Q(transfer_request__source_warehouse__in=warehouses)
            | Q(transfer_request__destination_warehouse__in=warehouses)
        ).select_related(
            "transfer_request__product",
            "transfer_request__source_warehouse",
            "transfer_request__destination_warehouse",
            "approver",
        )


        for t in transfers:
            tr = t.transfer_request

            if tr.source_warehouse in warehouses:
                qty = -tr.quantity
                src = tr.source_warehouse.name
                dst = tr.destination_warehouse.name
            elif tr.destination_warehouse in warehouses:
                qty = tr.quantity
                src = tr.source_warehouse.name
                dst = tr.destination_warehouse.name
            else:
                continue

            movements.append({
                "date": tr.created_at.strftime("%Y-%m-%d %H:%M"),
                "product": tr.product.name,
                "quantity": qty,
                "source": src,
                "destination": dst,
                "performed_by": t.approver.username,
            })

        movements.sort(key=lambda x: x["date"])

        if not warehouses:
             return Response({"error": "No warehouses found"}, status=404)

        try:
            return generate_stock_movement_pdf(
                warehouse=None if len(warehouses) > 1 else warehouses[0],
                movements=movements,
                start_date=start_date,
                end_date=end_date,
                user=request.user,
            )
        except Exception as e:
            return Response({"error": f"Failed to generate report: {str(e)}"}, status=500)



class LowStockThresholdAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        if request.user.role.name == Role.ADMIN:
            return LowStockThreshold.objects.all()

        if request.user.role.name == Role.MANAGER:
            return LowStockThreshold.objects.filter(
                warehouse__manager__user=request.user
            )

        # Staff and Viewers have no access to thresholds
        return LowStockThreshold.objects.none()

    def get(self, request):
        qs = self.get_queryset(request)
        serializer = LowStockThresholdSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = LowStockThresholdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        warehouse = serializer.validated_data["warehouse"]

        # Manager safety check
        if (
            request.user.role.name == Role.MANAGER
            and warehouse.manager.user != request.user
        ):
            return Response(
                {"error": "Not your warehouse"},
                status=status.HTTP_403_FORBIDDEN,
            )

        threshold, created = LowStockThreshold.objects.update_or_create(
            warehouse=serializer.validated_data["warehouse"],
            product=serializer.validated_data["product"],
            defaults={
                "threshold_quantity": serializer.validated_data[
                    "threshold_quantity"
                ]
            },
        )

        return Response(
            LowStockThresholdSerializer(threshold).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        threshold_id = request.data.get("id")

        if not threshold_id:
            return Response(
                {"error": "id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            threshold = LowStockThreshold.objects.get(id=threshold_id)
        except LowStockThreshold.DoesNotExist:
            return Response(
                {"error": "Threshold not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            request.user.role.name == Role.MANAGER
            and threshold.warehouse.manager.user != request.user
        ):
            return Response(
                {"error": "Not your warehouse"},
                status=status.HTTP_403_FORBIDDEN,
            )

        threshold.delete()
        return Response(
            {"status": "THRESHOLD_DELETED"},
            status=status.HTTP_200_OK,
        )


class WarehouseDeleteValidateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = WarehouseDeleteValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        warehouse_id = serializer.validated_data["warehouse_id"]

        try:
            warehouse = Warehouse.objects.get(
                id=warehouse_id,
                is_deleted=False
            )
        except Warehouse.DoesNotExist:
            return Response(
                {"error": "Warehouse not found"},
                status=404
            )

        # ---- Stock ----
        stocks = Stock.objects.filter(warehouse=warehouse)

        stock_items = []
        total_qty = 0

        for stock in stocks:
            stock_items.append({
                "product_id": stock.product.id,
                "product": stock.product.name,
                "quantity": stock.quantity,
            })
            total_qty += stock.quantity

        # ---- Staff ----
        staff_qs = Staff.objects.filter(warehouse=warehouse)
        staff_ids = list(staff_qs.values_list("id", flat=True))

        # ---- Manager ----
        manager = getattr(warehouse, "manager", None)

        manager_info = {
            "exists": bool(manager),
            "manager_id": manager.id if manager else None,
            "user_id": manager.user.id if manager else None,
            "will_be_demoted": False,
        }

        if manager:
            other_warehouses = Warehouse.objects.filter(
                manager=manager,
                is_deleted=False
            ).exclude(id=warehouse.id)

            # Demote ONLY if this is last warehouse
            manager_info["will_be_demoted"] = not other_warehouses.exists()

        # ---- Required Actions ----
        required_actions = []

        if stocks.exists():
            required_actions.append("MOVE_STOCK")

        if staff_qs.exists():
            required_actions.append("REASSIGN_STAFF")

        if manager and manager_info["will_be_demoted"]:
            required_actions.append("HANDLE_MANAGER")

        return Response({
            "warehouse": {
                "id": warehouse.id,
                "name": warehouse.name,
                "location": warehouse.location,
            },
            "stock_summary": {
                "total_products": stocks.count(),
                "total_quantity": total_qty,
                "items": stock_items,
            },
            "staff_summary": {
                "staff_count": staff_qs.count(),
                "staff_ids": staff_ids,
            },
            "manager": manager_info,
            "can_delete": len(required_actions) == 0,
            "required_actions": required_actions,
        })


class WarehouseDeleteConfirmAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @transaction.atomic
    def post(self, request):
        serializer = WarehouseDeleteConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        if not data["confirm"]:
            return Response(
                {"error": "Deletion not confirmed"},
                status=400
            )

        try:
            warehouse = Warehouse.objects.select_for_update().get(
                id=data["warehouse_id"],
                is_deleted=False
            )
        except Warehouse.DoesNotExist:
            return Response(
                {"error": "Warehouse not found"},
                status=404
            )

        # -------- STOCK MOVE --------
        stocks = Stock.objects.filter(warehouse=warehouse)

        if stocks.exists():
            if "stock_map" not in data:
                return Response(
                    {"error": "stock_map required"},
                    status=400
                )

            for stock in stocks:
                dest_id = data["stock_map"].get(str(stock.product.id))
                if not dest_id:
                    return Response(
                        {"error": f"No destination for product {stock.product.id}"},
                        status=400
                    )

                dest_wh = Warehouse.objects.get(id=dest_id, is_deleted=False)

                dest_stock, _ = Stock.objects.get_or_create(
                    warehouse=dest_wh,
                    product=stock.product,
                    defaults={"quantity": 0},
                )

                dest_stock.quantity += stock.quantity
                dest_stock.save()

            stocks.delete()

        # -------- STAFF REASSIGN --------
        # -------- STAFF REASSIGN --------
        staff_qs = Staff.objects.filter(warehouse=warehouse)
        if staff_qs.exists():
            sid = data.get("staff_reassign_warehouse_id")
            if sid:
                try:
                    new_wh = Warehouse.objects.get(id=sid, is_deleted=False)
                    staff_qs.update(warehouse=new_wh)
                except Warehouse.DoesNotExist:
                     return Response({"error": "Target warehouse for staff not found"}, status=404)
            else:
                # Fallback: If no ID provided, just unassign them
                # This prevents the "required" deadlock
                staff_qs.update(warehouse=None)

        # -------- MANAGER HANDLING --------
        manager = getattr(warehouse, "manager", None)

        if manager:
            other_warehouses = Warehouse.objects.filter(
                manager=manager,
                is_deleted=False
            ).exclude(id=warehouse.id)

            if not other_warehouses.exists():
                # LAST warehouse → demote
                manager.user.role = Role.objects.get(name=Role.STAFF)
                manager.user.save(update_fields=["role"])
                manager.delete()
            else:
                # Reassign manager if provided
                mid = data.get("manager_reassign_warehouse_id")
                if mid:
                    try:
                        new_wh = Warehouse.objects.get(
                            id=mid,
                            is_deleted=False
                        )
                        new_wh.manager = manager
                        new_wh.save()
                    except Warehouse.DoesNotExist:
                        return Response({"error": "Target warehouse for manager not found"}, status=404)
        warehouse.manager = None

        # -------- SOFT DELETE --------
        warehouse.is_deleted = True
        warehouse.deleted_by = request.user
        warehouse.save(update_fields=["is_deleted", "deleted_by"])

        return Response({
            "status": "WAREHOUSE_DELETED",
            "warehouse_id": warehouse.id
        })

# =====================================================
# STAFF TRANSFER VIEWS
# =====================================================

class StaffTransferRequestListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Admin: See ALL pending
        if user.role.name == Role.ADMIN:
            qs = StaffTransferRequest.objects.filter(status=StaffTransferRequest.STATUS_PENDING).select_related(
                "staff__user", "target_warehouse", "requested_by", "staff__warehouse"
            )
            
        # 2. Manager: See pending requests where they manage Source OR Target warehouse
        elif user.role.name == Role.MANAGER:
            # Get warehouses managed by this user
            managed_warehouses = Warehouse.objects.filter(manager__user=user)
            
            qs = StaffTransferRequest.objects.filter(
                status=StaffTransferRequest.STATUS_PENDING
            ).filter(
                Q(staff__warehouse__in=managed_warehouses) | 
                Q(target_warehouse__in=managed_warehouses)
            ).select_related(
                "staff__user", "target_warehouse", "requested_by", "staff__warehouse"
            ).distinct()
            
        # 3. Staff: See OWN requests (any status)
        elif user.role.name == Role.STAFF:
             qs = StaffTransferRequest.objects.filter(
                staff__user=user
            ).select_related(
                "target_warehouse", "requested_by"
            )
        else:
            return Response([], status=200)

        serializer = StaffTransferRequestSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        log_error(f"StaffTransfer POST called by {request.user.username} (Role: {request.user.role.name}) Data: {request.data}")
        user = request.user
        data = request.data
        
        # Staff can initiate for themselves
        # Admin/Manager can initiate for others
        
        target_warehouse_id = data.get("target_warehouse_id")
        staff_id = data.get("staff_id") # If admin/manager
        
        if not target_warehouse_id:
            return Response({"error": "target_warehouse_id required"}, status=400)

        if user.role.name == Role.STAFF:
            # Self transfer request
            staff = getattr(user, "staff", None)
            if not staff:
                 return Response({"error": "You are not a staff member"}, status=400)
            target_staff = staff
            
        elif user.role.name in [Role.ADMIN, Role.MANAGER]:
            if not staff_id:
                 return Response({"error": "staff_id required"}, status=400)
            try:
                target_staff = Staff.objects.get(id=staff_id)
            except Staff.DoesNotExist:
                return Response({"error": "Staff not found"}, status=404)
                
            # Manager check: Must manage the staff's CURRENT warehouse? 
            # "admins and managers with multiple warehouses should have the authority... under their juristiction"
            # So Manager must manage `target_staff.warehouse`.
            if user.role.name == Role.MANAGER:
                current_wh = target_staff.warehouse
                # If staff has no warehouse, maybe manager can pick them up? 
                # Assuming staff is already in a warehouse if we talk about "transfer". 
                # If unassigned, it's an "Assignment" (Approve) which we already have. 
                # Let's assume Transfer implies Source -> Dest.
                
                if current_wh:
                    if not current_wh.manager or current_wh.manager.user != user:
                        return Response({"error": "You do not manage this staff's current warehouse"}, status=403)
                else:
                    # Logic for unassigned staff transfer? 
                    # Maybe allow if Manager manages target?
                    # But prompt says "transfer staff FROM one warehouse TO another"
                    pass
        else:
             return Response({"error": "Forbidden"}, status=403)

        # Validate Target Warehouse
        try:
            target_wh = Warehouse.objects.get(id=target_warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "Target warehouse not found"}, status=404)

        # Create Request
        try:
            transfer_req = StaffTransferRequest.objects.create(
                staff=target_staff,
                target_warehouse=target_wh,
                requested_by=user,
                status=StaffTransferRequest.STATUS_PENDING
            )
            
            # AUTO-APPROVE Logic for Admin or Dual-Manager
            should_auto_approve = False
            if user.role.name == Role.ADMIN:
                should_auto_approve = True
            elif user.role.name == Role.MANAGER:
                # Check if manager manages BOTH source and target
                source_wh = transfer_req.staff.warehouse
                target_wh = transfer_req.target_warehouse
                 # Check Source
                is_source_mgr = source_wh and source_wh.manager and source_wh.manager.user == user
                # Check Target
                is_target_mgr = target_wh.manager and target_wh.manager.user == user
                
                if is_source_mgr and is_target_mgr:
                    should_auto_approve = True
                    
            if should_auto_approve:
                transfer_req.status = StaffTransferRequest.STATUS_APPROVED
                transfer_req.approved_by = user
                transfer_req.approved_at = timezone.now()
                transfer_req.save()
                
                # Update Staff Warehouse
                staff = transfer_req.staff
                staff.warehouse = transfer_req.target_warehouse
                staff.save()
        except Exception as e:
            import traceback
            log_error(f"Error creating transfer request: {e}")
            log_error(traceback.format_exc())
            return Response({"error": f"Internal Error: {str(e)}"}, status=500)


        
        return Response(StaffTransferRequestSerializer(transfer_req).data, status=status.HTTP_201_CREATED)


class StaffTransferApprovalAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        # Approve
        try:
            req = StaffTransferRequest.objects.select_related("staff", "target_warehouse", "staff__warehouse").get(id=pk)
        except StaffTransferRequest.DoesNotExist:
             return Response({"error": "Request not found"}, status=404)
             
        if req.status != StaffTransferRequest.STATUS_PENDING:
             return Response({"error": "Request is not PENDING"}, status=400)

        user = request.user
        
        # PERMISSIONS
        # Admin: Allow
        # Manager: "only possible if that staff is under a manager and that same manager is also in charge of the warehouse the staff intend to get transfered to"
        # i.e. Manager must manage Source AND Target.
        
        if user.role.name == Role.ADMIN:
            pass
        elif user.role.name == Role.MANAGER:
            source_wh = req.staff.warehouse
            target_wh = req.target_warehouse
            
            # Check Source
            if source_wh:
                if not source_wh.manager or source_wh.manager.user != user:
                     return Response({"error": "You do not manage the source warehouse"}, status=403)
            # Check Target
            if not target_wh.manager or target_wh.manager.user != user:
                 return Response({"error": "You do not manage the target warehouse"}, status=403)
        else:
            return Response({"error": "Forbidden"}, status=403)

        # EXECUTE TRANSFER
        req.status = StaffTransferRequest.STATUS_APPROVED
        req.approved_by = user
        req.approved_at = timezone.now()
        req.save()
        
        # Update Staff
        staff = req.staff
        staff.warehouse = req.target_warehouse
        staff.save()
        
        return Response({"status": "APPROVED", "staff": staff.user.username, "new_warehouse": req.target_warehouse.name})


class StaffTransferRejectAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            req = StaffTransferRequest.objects.select_related("staff", "target_warehouse", "staff__warehouse").get(id=pk)
        except StaffTransferRequest.DoesNotExist:
             return Response({"error": "Request not found"}, status=404)

        if req.status != StaffTransferRequest.STATUS_PENDING:
             return Response({"error": "Request is not PENDING"}, status=400)

        # Permissions: Same as Approve? Or can Source manager reject even if they don't own Target?
        # Usually rejection is easier. Let's enforce same rule for consistency or allow source-only manager to blocking exit.
        # "admins /managers should ahave an option to approve or reject it"
        # Let's use same strict rule for now to avoid complexity.
        
        user = request.user
        if user.role.name == Role.ADMIN:
            pass
        elif user.role.name == Role.MANAGER:
            source_wh = req.staff.warehouse
            target_wh = req.target_warehouse
            
            # Allow rejection if manager owns Source OR Target?
            # If I own source, I can prevent leaving.
            # If I own target, I can prevent entering.
            is_source_mgr = source_wh and source_wh.manager and source_wh.manager.user == user
            is_target_mgr = target_wh.manager and target_wh.manager.user == user
            
            if not (is_source_mgr or is_target_mgr):
                 return Response({"error": "You do not manage source or target warehouse"}, status=403)
        else:
            return Response({"error": "Forbidden"}, status=403)

        req.status = StaffTransferRequest.STATUS_REJECTED
        req.approved_by = user # Rejected by
        req.approved_at = timezone.now()
        req.save()
        
        return Response({"status": "REJECTED"})


# =====================================================
# DETAIL VIEWS FOR DRAWER SYSTEM
# =====================================================

class ProductDetailAPIView(APIView):
    """
    GET /api/products/{id}/detail/
    Returns comprehensive product details for drawer view.
    Permissions: Authenticated users can view. Admin sees all fields.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)
        
        # Import here to avoid circular import
        from warehouses.serializers import ProductDetailSerializer
        
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)


class StockDetailAPIView(APIView):
    """
    GET /api/stocks/{id}/detail/
    Returns comprehensive stock details for drawer view.
    Permissions:
    - Admin: Any stock
    - Manager: Only stock in managed warehouses
    - Staff: Only stock in assigned warehouse
    - Viewer: Forbidden
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            stock = Stock.objects.select_related('product', 'warehouse').get(pk=pk)
        except Stock.DoesNotExist:
            return Response({"error": "Stock not found"}, status=404)
        
        user = request.user
        
        # Permission checks
        if user.role.name == Role.ADMIN:
            pass  # Admin can view any stock
        elif user.role.name == Role.MANAGER:
            # Manager can only view stock in their warehouses
            if not Warehouse.objects.filter(id=stock.warehouse.id, manager__user=user).exists():
                return Response({"error": "Forbidden"}, status=403)
        elif user.role.name == Role.STAFF:
            # Staff can only view stock in their assigned warehouse
            if not (hasattr(user, 'staff') and user.staff.warehouse == stock.warehouse):
                return Response({"error": "Forbidden"}, status=403)
        else:
            return Response({"error": "Forbidden"}, status=403)
        
        from warehouses.serializers import StockDetailSerializer
        serializer = StockDetailSerializer(stock)
        return Response(serializer.data)


class PurchaseRequestDetailAPIView(APIView):
    """
    GET /api/purchase-requests/{id}/detail/
    Returns comprehensive purchase request details for drawer view.
    Permissions:
    - Viewer: Own requests only
    - Staff/Manager: Requests for their warehouse
    - Admin: All requests
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            pr = PurchaseRequest.objects.select_related(
                'product', 'warehouse', 'viewer', 'processed_by'
            ).get(pk=pk)
        except PurchaseRequest.DoesNotExist:
            return Response({"error": "Purchase request not found"}, status=404)
        
        user = request.user
        
        # Permission checks
        if user.role.name == Role.ADMIN:
            pass  # Admin can view all
        elif user.role.name == Role.MANAGER:
            # Manager can view requests for their warehouses
            if not Warehouse.objects.filter(id=pr.warehouse.id, manager__user=user).exists():
                return Response({"error": "Forbidden"}, status=403)
        elif user.role.name == Role.STAFF:
            # Staff can view requests for their warehouse
            if not (hasattr(user, 'staff') and user.staff.warehouse == pr.warehouse):
                return Response({"error": "Forbidden"}, status=403)
        elif user.role.name == Role.VIEWER:
            # Viewer can only view their own requests
            if pr.viewer != user:
                return Response({"error": "Forbidden"}, status=403)
        else:
            return Response({"error": "Forbidden"}, status=403)
        
        from warehouses.serializers import PurchaseRequestDetailSerializer
        serializer = PurchaseRequestDetailSerializer(pr)
        return Response(serializer.data)


class TransferRequestDetailAPIView(APIView):
    """
    GET /api/transfer-requests/{id}/detail/
    Returns comprehensive transfer request details for drawer view.
    Permissions:
    - Admin: All requests
    - Manager: Requests involving their warehouses (source or destination)
    - Others: Forbidden
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            tr = TransferRequest.objects.select_related(
                'product', 'source_warehouse', 'destination_warehouse', 
                'requested_by', 'approved_by'
            ).get(pk=pk)
        except TransferRequest.DoesNotExist:
            return Response({"error": "Transfer request not found"}, status=404)
        
        user = request.user
        
        # Permission checks
        if user.role.name == Role.ADMIN:
            pass  # Admin can view all
        elif user.role.name == Role.MANAGER:
            # Manager can view if they manage source or destination warehouse
            warehouses = Warehouse.objects.filter(manager__user=user)
            if not (tr.source_warehouse in warehouses or tr.destination_warehouse in warehouses):
                return Response({"error": "Forbidden"}, status=403)
        else:
            return Response({"error": "Forbidden"}, status=403)
        
        from warehouses.serializers import TransferRequestDetailSerializer
        serializer = TransferRequestDetailSerializer(tr)
        return Response(serializer.data)


class UserDetailAPIView(APIView):
    """
    GET /api/users/{id}/detail/
    Returns comprehensive user details for drawer view.
    Permissions:
    - Admin: Any user
    - Manager: Staff in their warehouse
    - Staff/Viewer: Own profile only
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            target_user = User.objects.select_related('role').get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        user = request.user
        
        # Permission checks
        if user.role.name == Role.ADMIN:
            pass  # Admin can view any user
        elif user.role.name == Role.MANAGER:
            # Manager can view staff in their warehouse
            if target_user.role.name == Role.STAFF:
                if not (hasattr(target_user, 'staff') and 
                        target_user.staff.warehouse and
                        Warehouse.objects.filter(id=target_user.staff.warehouse.id, manager__user=user).exists()):
                    return Response({"error": "Forbidden"}, status=403)
            elif target_user != user:
                return Response({"error": "Forbidden"}, status=403)
        else:
            # Staff/Viewer can only view own profile
            if target_user != user:
                return Response({"error": "Forbidden"}, status=403)
        
        # Build response data
        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        
        from warehouses.serializers import UserProfileSerializer
        profile_data = UserProfileSerializer(profile).data
        
        # Get warehouse assignments
        assigned_warehouses = []
        role_specific_info = {}
        
        if target_user.role.name == Role.MANAGER:
            try:
                manager_profile = target_user.manager
                assigned = Warehouse.objects.filter(manager=manager_profile).values("id", "name")
                assigned_warehouses = list(assigned)
                role_specific_info["manager_id"] = manager_profile.id
            except (Manager.DoesNotExist, AttributeError):
                pass
        elif target_user.role.name == Role.STAFF:
            try:
                staff_profile = target_user.staff
                if staff_profile.warehouse:
                    assigned_warehouses = [{
                        "id": staff_profile.warehouse.id, 
                        "name": staff_profile.warehouse.name
                    }]
                role_specific_info["staff_id"] = staff_profile.id
            except (Staff.DoesNotExist, AttributeError):
                pass
        elif target_user.role.name == Role.VIEWER:
            try:
                viewer_profile = Viewer.objects.get(user=target_user)
                role_specific_info["viewer_id"] = viewer_profile.id
            except Viewer.DoesNotExist:
                pass
        
        data = {
            "id": target_user.id,
            "username": target_user.username,
            "email": target_user.email,
            "role": target_user.role.name if target_user.role else None,
            "is_active": target_user.is_active,
            "last_login": target_user.last_login,
            "date_joined": target_user.date_joined,
            "profile": profile_data,
            "assigned_warehouses": assigned_warehouses,
            "role_specific_info": role_specific_info
        }
        
        return Response(data)

