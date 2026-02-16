
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
        transfer_req = StaffTransferRequest.objects.create(
            staff=target_staff,
            target_warehouse=target_wh,
            requested_by=user,
            status=StaffTransferRequest.STATUS_PENDING
        )
        
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
