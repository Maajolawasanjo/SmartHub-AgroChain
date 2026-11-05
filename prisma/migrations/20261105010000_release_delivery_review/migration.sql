-- Phase 17: a post-delivery buyer dispute must not remain visually marked COMPLETED.
-- Do not amend financial balances, refunds, consumption or supplier transfers automatically.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_REVIEW';
