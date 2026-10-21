# Checkout voucher discovery and selection

Status: complete · 21/10/2026. [Delivery evidence](../reports/implementation-261020-2350-voucher-picker.md).
Outcome: customers view public coupons, clear conditions/ineligibility and bestactualdiscount forcurrentbasket; explicitlyapplyselection through existingquote. Adminchoosesvisibility. VerifiedanddeployedexistingVPS.
Userdecision: adminopt-in publicity; legacycodesprivatebydefault. Privatecodesremainmanualvalid. No livecodes changed/seeded.
Policy: publicactive nonexpired offers; futureoffersvisiblewithreason. RecommendationamongeligiblepositiveoffersbyactualintegerVND savingaftercaps/subtotal, tiesearliestexpiry/code. Noautomaticapply orquotareservation; onecoupon aftersale excludingdelivery; finalquote/orderrevalidation unchanged. Currentaccount/quantity/firstorder/quota restrictions authoritative.
Constraints: authenticatepersonalizedlist; whitelistpublicDTO (noothercustomers/usagecounts/privatecodes); freshcartservercalculation; abortion/serialguards staleUI; parentorderform buttons cannot submitwhilechoosing/closing. Preservemanualcodes, hiddenprivatebettercoupon and allpriororder/sessioncontracts. NoSQLDDL; backupbeforedeploy; preserveexistingVPS/privateenv.
Non-goals: wallet/savevouchercollection, campaigns/autocodes, automaticstacking, personalizedprivatecodeassignment, newdiscounttypes.

- [x] Backendpublicfield/sharedeligibility/listDTO/bestranking/read-onlytests.
- [x] Frontendadminvisibility, picker/reasons/conditions/best/manualselection/mobile; integrationtypes/router/Dialogsafeclose.
- [x] Isolatedbrowser +SQLite/PGtests, fullserver/lint/build, independentreview.
- [x] Privatebackup/scan/deploy/livepublicsmoke/docs/report/processcleanup.

Ownership: backendworker promotions/validation/newroute/tests; UIworker coupon/picker/hook+adminvisibility; browserworker fixture3016/journey; controller types/context/index/Dialog/deploy/docs. Nooverlappingedits.
