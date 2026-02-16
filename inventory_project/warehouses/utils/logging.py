from django.db.models import Q
from purchases.models import PurchaseApproval
from transfers.models import TransferApproval
from roles.models import StaffApproval, ManagerPromotionRequest, Role

def _safe_getattr(obj, attr, default=None):
    try:
        return getattr(obj, attr, default)
    except Exception:
        return default

def get_recent_logs(user, warehouse_id=None, limit=20):
    """
    Aggregates logs from Purchase, Transfer, Staff, and Manager activities.
    Returns a sorted list of dictionaries.
    
    Args:
        user: The user requesting the logs (for permission checks if needed, 
              though usually checked by view).
        warehouse_id: If provided, filters logs relevant to that warehouse.
        limit: Max number of logs to return.
    """
    
    events = []

    # ---------------------------------------------------------
    # 1. Purchase Approvals
    # ---------------------------------------------------------
    pa_qs = PurchaseApproval.objects.select_related(
        "purchase_request", "purchase_request__product", "purchase_request__warehouse", "approver"
    ).all()

    if warehouse_id:
        pa_qs = pa_qs.filter(purchase_request__warehouse_id=warehouse_id)

    for pa in pa_qs:
        pr = pa.purchase_request
        dec = pa.decision
        
        # Determine status/type
        if str(dec).upper().startswith("APPROV"):
            event_type = "PURCHASE_APPROVED"
            status = "APPROVED"
        else:
            event_type = "PURCHASE_REJECTED"
            status = "REJECTED"
            
        events.append({
            "event_id": pa.id,
            "event_type": event_type,
            "timestamp": pa.created_at, # Approval time
            "main_text": pr.product.name if pr.product else "Unknown Product",
            "sub_text": f"Qty: {pr.quantity} • {status}",
            "performed_by": pa.approver.username if pa.approver else "Unknown",
            "status": status,
            "raw_date": pa.created_at, 
            # extra fields for frontend if needed (keeping existing warehouse dashboard structure in mind)
            "quantity_change": -pr.quantity if status == "APPROVED" else 0,
            "source_warehouse": pr.warehouse.name if pr.warehouse else None,
            "destination_warehouse": None,
        })

    # ---------------------------------------------------------
    # 2. Transfer Approvals
    # ---------------------------------------------------------
    ta_qs = TransferApproval.objects.select_related(
        "transfer_request", "transfer_request__product", 
        "transfer_request__source_warehouse", "transfer_request__destination_warehouse",
        "approver"
    ).all()

    if warehouse_id:
        # Include if warehouse is source OR destination
        ta_qs = ta_qs.filter(
            Q(transfer_request__source_warehouse_id=warehouse_id) | 
            Q(transfer_request__destination_warehouse_id=warehouse_id)
        )

    for ta in ta_qs:
        tr = ta.transfer_request
        dec = ta.decision
        
        if str(dec).upper().startswith("APPROV"):
            event_type = "TRANSFER_APPROVED"
            status = "APPROVED"
        else:
            event_type = "TRANSFER_REJECTED"
            status = "REJECTED"

        # Quantity change direction depends on warehouse context
        qty_change = 0
        if status == "APPROVED":
            if warehouse_id:
                if tr.source_warehouse_id == warehouse_id:
                    qty_change = -tr.quantity
                elif tr.destination_warehouse_id == warehouse_id:
                    qty_change = tr.quantity
            else:
                # Global view: net change is 0 globally, but physically it moves. 
                # We can just show the quantity transferred.
                qty_change = tr.quantity

        events.append({
            "event_id": ta.id,
            "event_type": event_type,
            "timestamp": ta.created_at,
            "main_text": tr.product.name if tr.product else "Unknown Product",
            "sub_text": f"Qty: {tr.quantity} • {status}",
            "performed_by": ta.approver.username if ta.approver else "Unknown",
            "status": status,
            "raw_date": ta.created_at,
            "quantity_change": qty_change,
            "source_warehouse": tr.source_warehouse.name if tr.source_warehouse else None,
            "destination_warehouse": tr.destination_warehouse.name if tr.destination_warehouse else None,
        })

    # ---------------------------------------------------------
    # 3. Staff Approvals
    # ---------------------------------------------------------
    sa_qs = StaffApproval.objects.select_related(
        "staff", "staff__user", "approved_by"
    ).all()

    # StaffApproval doesn't directly link to warehouse usually, 
    # but the Staff might be assigned to a warehouse NOW.
    # However, at approval time, they might not have been. 
    # We check `staff.warehouse`.
    if warehouse_id:
        sa_qs = sa_qs.filter(staff__warehouse_id=warehouse_id)

    for sa in sa_qs:
        staff_name = sa.staff.user.username
        events.append({
            "event_id": sa.id,
            "event_type": "STAFF_APPROVED",
            "timestamp": sa.approved_at,
            "main_text": f"Staff: {staff_name}",
            "sub_text": "Staff member approved",
            "performed_by": sa.approved_by.username if sa.approved_by else "Unknown",
            "status": "APPROVED",
            "raw_date": sa.approved_at,
            "quantity_change": 0,
            "source_warehouse": None,
            "destination_warehouse": None,
        })

    # ---------------------------------------------------------
    # 4. Manager Promotion Requests (Approvals)
    # ---------------------------------------------------------
    # specific to promotions that were approved/rejected
    mp_qs = ManagerPromotionRequest.objects.select_related(
        "staff", "staff__user", "approved_by", "requested_by"
    ).exclude(status="PENDING")

    # Manager promotions don't link to a warehouse directly in the request usually,
    # unless we infer from the staff's current warehouse.
    if warehouse_id:
         mp_qs = mp_qs.filter(staff__warehouse_id=warehouse_id)

    for mp in mp_qs:
        staff_name = mp.staff.user.username
        status = mp.status
        event_type = f"MANAGER_PROMOTION_{status}"
        
        events.append({
            "event_id": mp.id,
            "event_type": event_type,
            "timestamp": mp.approved_at or mp.requested_at,
            "main_text": f"Manager Promo: {staff_name}",
            "sub_text": f"Status: {status}",
            "performed_by": mp.approved_by.username if mp.approved_by else "Unknown",
            "status": status,
            "raw_date": mp.approved_at or mp.requested_at,
            "quantity_change": 0,
            "source_warehouse": None,
            "destination_warehouse": None,
        })

    # ---------------------------------------------------------
    # Sort and Limit
    # ---------------------------------------------------------
    # Sort by timestamp descending (newest first)
    # Use raw_date for sorting, filter out None dates just in case
    events.sort(key=lambda x: x["raw_date"] or x["timestamp"], reverse=True)
    
    # Remove raw_date before returning if desired, or keep it.
    # We'll return the slice.
    return events[:limit]
