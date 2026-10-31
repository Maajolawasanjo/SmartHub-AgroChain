# User journey release rule

Every action follows **Entry → Eligibility → Form → Server validation → Persist → Audit → Notify → Next action → Error recovery**.

## Buyer example

Public page → buyer sign-up (not yet implemented) → email verification → business profile → request → Operations review → matched supply + quotation → buyer acceptance → pending-payment order → verified upfront payment → confirmed order → fulfilment → receipt/exception → completion.

## Farmer example

Farmer sign-up (not yet implemented) → email verification → one-time SMS confirmation → farmer profile and farm → crop/available supply declaration → Operations review → opportunity interest → approved reservation → fulfilment → settlement record.

## Operations example

Assigned review queue → inspect evidence → approve/request information/reject → audit event → authorized user notification; verify quotations and release transactions only through approved permissions.

For every page, implement route, entry point, authorization, loading/empty/error, real records, permitted CTA, next screen, and E2E test. No disconnected buttons and no fabricated operational metrics.
