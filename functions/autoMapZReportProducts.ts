import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ✅ יצירת Hash Maps לחיפוש מהיר O(1)
function createServiceLookupMaps(servicesList) {
  const byCatalogId = new Map();
  const byBarcode = new Map();
  const byItemCode = new Map();
  const byExactName = new Map();
  const byNormalizedName = new Map();

  servicesList.forEach(service => {
    const serviceName = service.service_name;
    
    if (service.catalog_product_id) {
      byCatalogId.set(service.catalog_product_id.toString().trim(), serviceName);
    }
    if (service.barcode) {
      byBarcode.set(service.barcode.toString().trim(), serviceName);
    }
    if (service.item_code) {
      byItemCode.set(service.item_code.toString().trim(), serviceName);
    }
    
    const normalized = serviceName.toLowerCase().trim();
    byExactName.set(normalized, serviceName);
    
    // לחיפוש חלקי - שומר את כל המילים
    normalized.split(' ').forEach(word => {
      if (word.length > 2) {
        if (!byNormalizedName.has(word)) {
          byNormalizedName.set(word, []);
        }
        byNormalizedName.get(word).push(serviceName);
      }
    });
  });

  return { byCatalogId, byBarcode, byItemCode, byExactName, byNormalizedName };
}

function findBestMatch(zProduct, lookupMaps, existingMapping) {
  // 1. Existing manual mapping
  if (existingMapping && existingMapping[zProduct.product_name]) {
    return existingMapping[zProduct.product_name];
  }

  const { byCatalogId, byBarcode, byItemCode, byExactName, byNormalizedName } = lookupMaps;
  const zBarcode = zProduct.barcode ? zProduct.barcode.toString().trim() : '';
  const normalizedName = zProduct.product_name.toLowerCase().trim();

  // 2. Barcode Match (O(1) lookup)
  if (zBarcode) {
    if (byCatalogId.has(zBarcode)) return byCatalogId.get(zBarcode);
    if (byBarcode.has(zBarcode)) return byBarcode.get(zBarcode);
    if (byItemCode.has(zBarcode)) return byItemCode.get(zBarcode);
  }

  // 3. Exact Name Match (O(1) lookup)
  if (byExactName.has(normalizedName)) {
    return byExactName.get(normalizedName);
  }

  // 4. Partial Name Match
  const words = normalizedName.split(' ').filter(w => w.length > 2);
  for (const word of words) {
    if (byNormalizedName.has(word)) {
      const matches = byNormalizedName.get(word);
      if (matches.length === 1) {
        return matches[0];
      }
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { zProducts, services, existingMapping } = await req.json();

    console.log(`🗺️ Auto-mapping ${zProducts.length} products...`);

    // יצירת hash maps פעם אחת
    const lookupMaps = createServiceLookupMaps(services);
    
    const mapping = {};
    let unmappedCount = 0;

    // מיפוי כל המוצרים
    zProducts.forEach(product => {
      const match = findBestMatch(product, lookupMaps, existingMapping);
      if (match) {
        mapping[product.product_name] = match;
      } else {
        unmappedCount++;
      }
    });

    console.log(`✅ Auto-mapping completed: ${Object.keys(mapping).length} matched, ${unmappedCount} unmatched`);

    return Response.json({
      success: true,
      mapping,
      matched: Object.keys(mapping).length,
      unmatched: unmappedCount
    });

  } catch (error) {
    console.error('❌ Error in auto-mapping:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});