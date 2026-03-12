$tasks = @(
  @{query='Plan a trip to Tokyo with flights and hotel'; variant='control'},
  @{query='Plan a trip to Tokyo with flights and hotel'; variant='clair'},
  @{query='Find flights to Paris in April'; variant='control'},
  @{query='Find flights to Paris in April'; variant='clair'},
  @{query='Book a hotel in Rome near the Colosseum'; variant='control'},
  @{query='Book a hotel in Rome near the Colosseum'; variant='clair'},
  @{query='Plan a family vacation to Bali with kids activities'; variant='control'},
  @{query='Plan a family vacation to Bali with kids activities'; variant='clair'},
  @{query='Find restaurants and dining options in Barcelona'; variant='control'},
  @{query='Find restaurants and dining options in Barcelona'; variant='clair'},
  @{query='Redesign the result card component to show a token savings progress bar'; variant='control'},
  @{query='Redesign the result card component to show a token savings progress bar'; variant='clair'},
  @{query='Add a modal dialog to confirm before resetting test data'; variant='control'},
  @{query='Add a modal dialog to confirm before resetting test data'; variant='clair'},
  @{query='Update the layout to use a two-column grid on desktop'; variant='control'},
  @{query='Update the layout to use a two-column grid on desktop'; variant='clair'},
  @{query='Add a copy-to-clipboard button for the result response text'; variant='control'},
  @{query='Add a copy-to-clipboard button for the result response text'; variant='clair'},
  @{query='The submit button is not firing the click event handler after the first request'; variant='control'},
  @{query='The submit button is not firing the click event handler after the first request'; variant='clair'},
  @{query='Add a debounced search input with autocomplete suggestions'; variant='control'},
  @{query='Add a debounced search input with autocomplete suggestions'; variant='clair'},
  @{query='Implement a toggle button to show/hide the raw skills list'; variant='control'},
  @{query='Implement a toggle button to show/hide the raw skills list'; variant='clair'},
  @{query='The stats panel shows stale data and does not refresh after submitting a query'; variant='control'},
  @{query='The stats panel shows stale data and does not refresh after submitting a query'; variant='clair'},
  @{query='Getting a TypeError: Cannot read properties of undefined reading tokens_used'; variant='control'},
  @{query='Getting a TypeError: Cannot read properties of undefined reading tokens_used'; variant='clair'},
  @{query='CORS error when calling /api/plan from the frontend'; variant='control'},
  @{query='CORS error when calling /api/plan from the frontend'; variant='clair'},
  @{query='The variant badge is not showing after page reload'; variant='control'},
  @{query='The variant badge is not showing after page reload'; variant='clair'},
  @{query='Update the variant badge color scheme and add a hover animation'; variant='control'},
  @{query='Update the variant badge color scheme and add a hover animation'; variant='clair'},
  @{query='Add a dark/light mode toggle using CSS custom properties'; variant='control'},
  @{query='Add a dark/light mode toggle using CSS custom properties'; variant='clair'},
  @{query='Make the stats table responsive for mobile with horizontal scroll'; variant='control'},
  @{query='Make the stats table responsive for mobile with horizontal scroll'; variant='clair'},
  @{query='The localStorage variant assignment is not persisting across page refreshes'; variant='control'},
  @{query='The localStorage variant assignment is not persisting across page refreshes'; variant='clair'},
  @{query='Implement auto-refresh of stats every 5 seconds using setInterval'; variant='control'},
  @{query='Implement auto-refresh of stats every 5 seconds using setInterval'; variant='clair'},
  @{query='Reset all state and clear localStorage when the user clicks Reset'; variant='control'},
  @{query='Reset all state and clear localStorage when the user clicks Reset'; variant='clair'},
  @{query='Add a GET /api/export endpoint to download all A/B events as JSON'; variant='control'},
  @{query='Add a GET /api/export endpoint to download all A/B events as JSON'; variant='clair'},
  @{query='Add input validation to the POST /api/plan endpoint'; variant='control'},
  @{query='Add input validation to the POST /api/plan endpoint'; variant='clair'},
  @{query='Add request logging middleware to Express for all API routes'; variant='control'},
  @{query='Add request logging middleware to Express for all API routes'; variant='clair'}
)

Write-Host "Running A/B simulation with $($tasks.Count) tasks..."
$results = @()
foreach ($t in $tasks) {
  $body = $t | ConvertTo-Json -Compress
  $r = Invoke-RestMethod -Uri 'http://localhost:3003/api/plan' -Method POST -Body $body -ContentType 'application/json'
  $results += $r
  Write-Host ($r.variant.PadRight(8) + $r.task_category.PadRight(22) + "tokens=" + $r.tokens_used + " skills=" + $r.skills_loaded.Count + " saved=" + $r.tokens_saved_vs_full_load)
}

Write-Host ""
Write-Host "=== SIMULATION COMPLETE ==="
Write-Host "Total tasks: $($results.Count)"

$stats = Invoke-RestMethod -Uri 'http://localhost:3003/api/ab-stats'
Write-Host ""
Write-Host "=== AGGREGATE STATS ==="
Write-Host "Total events: $($stats.total_events)"
Write-Host "Control avg tokens: $($stats.control.avg_tokens) ($($stats.control.count) requests, $($stats.control.avg_skills_loaded) skills avg)"
Write-Host "CLAIR avg tokens:   $($stats.clair.avg_tokens) ($($stats.clair.count) requests, $($stats.clair.avg_skills_loaded) skills avg)"
Write-Host "Avg tokens saved:   $($stats.estimated_savings) ($($stats.savings_percent)%)"
Write-Host ""
Write-Host "=== BY CATEGORY ==="
foreach ($cat in $stats.by_category) {
  Write-Host ($cat.category.PadRight(22) + "ctrl=" + $cat.avg_tokens_control + " clair=" + $cat.avg_tokens_clair + " saved=" + $cat.avg_tokens_saved + " (" + $cat.savings_percent + "%) ctrl_skills=" + $cat.avg_skills_control + " clair_skills=" + $cat.avg_skills_clair)
}

$stats | ConvertTo-Json -Depth 10 | Out-File -FilePath "ab_test_raw_results.json" -Encoding UTF8
Write-Host ""
Write-Host "Raw results saved to ab_test_raw_results.json"
