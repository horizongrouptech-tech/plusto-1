import React from 'react';
import CatalogManager from '../components/admin/CatalogManager';
import { useLocation } from 'react-router-dom';

export default function CatalogPage() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const customerId = queryParams.get('customerId');

    if (!customerId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-600">שגיאה: חסר מזהה לקוח.</h1>
                <p>לא ניתן להציג קטלוגים ללא בחירת לקוח.</p>
            </div>
        );
    }

    return <CatalogManager customerId={customerId} />;
}