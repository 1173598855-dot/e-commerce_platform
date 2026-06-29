$ErrorActionPreference = 'Stop'

$base = $env:API_BASE_URL
if (-not $base) {
  $base = 'http://localhost:4100/api'
}

function Assert-True($condition, $message) {
  if (-not $condition) {
    throw $message
  }
}

function Assert-Envelope($response, $name) {
  Assert-True ($null -ne $response.code) "$name missing code"
  Assert-True ($response.code -eq 200) "$name failed with code $($response.code): $($response.message)"
  Assert-True ($response.message) "$name missing message"
  Assert-True ($response.requestId) "$name missing requestId"
}

$health = Invoke-RestMethod -Uri "$base/health" -Method Get
Assert-Envelope $health 'health'

$products = Invoke-RestMethod -Uri "$base/products?page=1&pageSize=2" -Method Get
Assert-Envelope $products 'products list'
Assert-True ($products.data.list -and $products.data.list.Count -gt 0) 'products list empty'
$productId = $products.data.list[0].id

$detail = Invoke-RestMethod -Uri "$base/products/$productId" -Method Get
Assert-Envelope $detail 'product detail'
Assert-True ($detail.data.id -eq $productId) 'product detail id mismatch'

$loginBody = @{ phone = '13800138000'; password = '123456' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/auth/password-login" -Method Post -ContentType 'application/json' -Body $loginBody
Assert-Envelope $login 'password login'
Assert-True $login.data.accessToken 'login accessToken missing'
Assert-True $login.data.refreshToken 'login refreshToken missing'
Assert-True $login.data.user.id 'login user id missing'

$headers = @{ Authorization = "Bearer $($login.data.accessToken)" }

$cartBody = @{ product_id = $productId; quantity = 1 } | ConvertTo-Json
$cartAdd = Invoke-RestMethod -Uri "$base/orders/cart/add" -Method Post -Headers $headers -ContentType 'application/json' -Body $cartBody
Assert-Envelope $cartAdd 'cart add'

$cart = Invoke-RestMethod -Uri "$base/orders/cart" -Method Get -Headers $headers
Assert-Envelope $cart 'cart list'
Assert-True ($cart.data.items.Count -gt 0) 'cart empty after add'

$orderBody = @{
  items = @(@{ product_id = $productId; quantity = 1 })
  shipping_address = @{ receiver_name = 'Smoke User'; receiver_phone = '13800138000'; detail_address = 'Smoke test address' }
  remark = 'api smoke test'
} | ConvertTo-Json -Depth 5
$order = Invoke-RestMethod -Uri "$base/orders" -Method Post -Headers $headers -ContentType 'application/json' -Body $orderBody
Assert-Envelope $order 'order create'
Assert-True $order.data.orderId 'order id missing'

$payBody = @{ orderId = $order.data.orderId; paymentMethod = 'alipay' } | ConvertTo-Json
$pay = Invoke-RestMethod -Uri "$base/orders/payment/mock" -Method Post -Headers $headers -ContentType 'application/json' -Body $payBody
Assert-Envelope $pay 'payment mock'
Assert-True $pay.data.transactionId 'transaction id missing'

[pscustomobject]@{
  ok = $true
  base = $base
  productId = $productId
  userId = $login.data.user.id
  orderId = $order.data.orderId
  orderNo = $order.data.orderNo
  transactionId = $pay.data.transactionId
} | ConvertTo-Json
