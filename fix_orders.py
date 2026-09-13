path = r"C:\Users\someo\Documents\Codex\bounty_work\mova-new\lib\stellar\orders.ts"
with open(path, "r", encoding="utf-8") as fh:
    content = fh.read()
content = content.replace('import { hashOrderId, bytesToHex } from "./scval";', 'import { hashOrderId, bytesToHex, resolveOrderIdHash } from "./scval";')
content = content.replace("const orderIdHashBytes = await hashOrderId(orderId);", "const orderIdHashBytes = await resolveOrderIdHash(orderId);")
with open(path, "w", encoding="utf-8") as fh:
    fh.write(content)
print("done orders")
