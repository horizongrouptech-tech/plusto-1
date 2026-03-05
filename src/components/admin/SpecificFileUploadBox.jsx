import React, { useState, useRef } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw, CheckCircle, XCircle } from "lucide-react";




import { toast } from "sonner";
import { FileUpload } from '@/api/entities';
import { parseXlsx, processESNAReport, processPurchaseDocument } from '@/api/functions';
import { openRouterAPI, UploadFile } from '@/api/integrations';
 // ADDED: New function import

// JSON Schemas for PDF analysis - ENHANCED FOR INSIGHTS
const bankStatementSchema = {
  type: "object",
  properties: {
    account_summary: {
      type: "object",
      properties: {
        total_available_balance: { type: "string" },
        report_period: { type: "string" },
        account_number: { type: "string" },
        total_deposits: { type: "number" },
        total_withdrawals: { type: "number" },
        net_change: { type: "number" }
      },
      required: ["report_period", "account_number", "total_deposits", "total_withdrawals", "net_change"]
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          credit_amount: { type: "number" },
          debit_amount: { type: "number" },
          balance: { type: "number" }
        },
        required: ["date", "description", "balance"]
      }
    },
    key_insights: {
        type: "array",
        description: "Provide 3-5 key insights from the bank statement in Hebrew.",
        items: { type: "string" }
    },
    risk_flags: {
        type: "array",
        description: "List any potential financial risks or red flags observed, in Hebrew (e.g., large unexpected expenses, low balance).",
        items: { type: "string" }
    },
    top_expenses: {
        type: "array",
        description: "List the top 5 largest expenses (debits) from the statement.",
        items: {
            type: "object",
            properties: {
                description: { type: "string" },
                amount: { type: "number" }
            },
            required: ["description", "amount"]
        }
    }
  },
  required: ["account_summary", "transactions", "key_insights", "risk_flags", "top_expenses"]
};

const creditCardSchema = {
  type: "object",
  properties: {
    card_summary: {
      type: "object",
      properties: {
        card_number: { type: "string" },
        billing_date: { type: "string" },
        total_amount: { type: "number" }
      },
      required: ["card_number", "billing_date", "total_amount"]
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          merchant: { type: "string" },
          category: {type: "string"},
          billed_amount: { type: "number" }
        },
        required: ["date", "merchant", "billed_amount"]
      }
    },
    key_insights: {
        type: "array",
        description: "Provide 3-5 key spending insights from the credit card statement in Hebrew (e.g., spending trends, unusual charges).",
        items: { type: "string" }
    },
    top_spending_categories: {
        type: "array",
        description: "List the top 3-5 spending categories and their total amounts.",
        items: {
            type: "object",
            properties: {
                category: { type: "string" },
                total_amount: { type: "number" }
            },
            required: ["category", "total_amount"]
        }
    }
  },
  required: ["card_summary", "transactions", "key_insights", "top_spending_categories"]
};

// הוספת סכמות מפורטות לדוחות כספיים
const detailedBalanceSheetSchema = {
  type: "object",
  properties: {
    report_metadata: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        report_type: { type: "string" },
        generated_date: { type: "string" },
        period: {
          type: "object",
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            period_type: { type: "string" },
            period_description: { type: "string" }
          },
          required: ["start_date", "end_date", "period_type"]
        },
        currency: { type: "string" },
        report_version: { type: "number" }
      },
      required: ["company_name", "report_type", "generated_date", "period", "currency"]
    },
    financial_summary: {
      type: "object",
      properties: {
        total_revenue: {
          type: "object",
          properties: {
            amount: { type: "number" },
            account_code: { type: "string" },
            account_name: { type: "string" },
            category: { type: "string" }
          },
          required: ["amount"]
        },
        total_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            breakdown: {
              type: "object",
              properties: {
                cost_of_goods_sold: { type: "number" },
                operating_expenses: { type: "number" },
                vehicle_expenses: { type: "number" },
                salary_expenses: { type: "number" },
                financing_expenses: { type: "number" }
              }
            }
          },
          required: ["amount"]
        },
        net_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            profit_margin_percentage: { type: "number" }
          },
          required: ["amount"]
        }
      },
      required: ["total_revenue", "total_expenses", "net_profit"]
    },
    revenue_breakdown: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          group_name: { type: "string" },
          accounts: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                percentage_of_total: { type: "number" }
              },
              required: ["name", "amount"]
            }
          },
          group_total: { type: "number" }
        },
        required: ["group_name", "accounts", "group_total"]
      }
    },
    expense_breakdown: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          group_name: { type: "string" },
          accounts: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                percentage_of_revenue: { type: "number" },
                note: { type: "string" }
              },
              required: ["name", "amount"]
            }
          },
          group_total: { type: "number" },
          percentage_of_revenue: { type: "number" }
        },
        required: ["group_name", "accounts", "group_total"]
      }
    },
    profitability_ratios: {
      type: "object",
      properties: {
        gross_profit_margin: { type: "number" },
        net_profit_margin: { type: "number" },
        operating_profit_margin: { type: "number" }
      }
    },
    key_insights: {
      type: "array",
      items: { type: "string" }
    },
    alerts_and_insights: {
      type: "object",
      properties: {
        positive_trends: { type: "array", items: { type: "string" } },
        areas_for_attention: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      }
    }
  },
  required: ["report_metadata", "financial_summary"]
};

const detailedProfitLossSchema = {
  type: "object",
  properties: {
    report_metadata: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        company_id: { type: "string" },
        report_type: { type: "string" },
        generated_date: { type: "string" },
        period: {
          type: "object",
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            period_type: { type: "string" },
            months_count: { type: "number" },
            period_description: { type: "string" }
          },
          required: ["start_date", "end_date", "period_type"]
        },
        tax_year: { type: "number" },
        currency: { type: "string" },
        report_version: { type: "number" }
      },
      required: ["company_name", "report_type", "generated_date", "period", "currency"]
    },
    financial_summary: {
      type: "object",
      properties: {
        total_revenue: {
          type: "object",
          properties: {
            amount: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        cost_of_goods_sold: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        gross_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        total_salary_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        general_admin_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        financing_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        operating_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        net_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        }
      },
      required: [
        "total_revenue", "cost_of_goods_sold", "gross_profit",
        "total_salary_expenses", "general_admin_expenses",
        "financing_expenses", "operating_profit", "net_profit"
      ]
    },
    revenue_analysis: {
      type: "object",
      properties: {
        revenue_streams: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_total: { type: "number" }
            },
            required: ["name", "amount"]
          }
        },
        revenue_trends: {
          type: "object",
          properties: {
            monthly_run_rate: { type: "number" },
            projected_annual_revenue: { type: "number" },
            daily_average: { type: "number" }
          }
        }
      },
      required: ["revenue_streams"]
    },
    cost_structure_analysis: {
      type: "object",
      properties: {
        cost_of_goods_sold: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" }
            },
            required: ["name", "amount"]
          }
        },
        salary_breakdown: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" },
              note: { type: "string" }
            },
            required: ["name", "amount"]
          }
        },
        general_admin_breakdown: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" }
            },
            required: ["name", "amount"]
          }
        },
        financing_breakdown: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" }
            },
            required: ["name", "amount"]
          }
        }
      }
    },
    profitability_ratios: {
      type: "object",
      properties: {
        gross_margin: { type: "number" },
        operating_margin: { type: "number" },
        net_margin: { type: "number" },
        cost_efficiency_ratio: { type: "number" }
      }
    },
    annual_projections: {
      type: "object",
      properties: {
        projected_revenue: { type: "number" },
        projected_cogs: { type: "number" },
        projected_gross_profit: { type: "number" },
        projected_net_profit: { type: "number" }
      }
    },
    expense_efficiency_analysis: {
      type: "object",
      properties: {
        salary_to_revenue_ratio: { type: "number" },
        admin_to_revenue_ratio: { type: "number" },
        financing_cost_ratio: { type: "number" },
        total_opex_ratio: { type: "number" }
      }
    },
    key_performance_indicators: {
      type: "object",
      properties: {
        monthly_burn_rate: { type: "number" },
        break_even_revenue: { type: "number" },
        revenue_per_employee: { type: "number" }
      }
    },
    alerts_and_insights: {
      type: "object",
      properties: {
        cost_alerts: { type: "array", items: { type: "string" } },
        efficiency_insights: { type: "array", items: { type: "string" } },
        growth_opportunities: { type: "array", items: { type: "string" } },
        risk_factors: { type: "array", items: { type: "string" } }
      }
    }
  },
  required: ["report_metadata", "financial_summary"]
};

// ADD: New schema for Bank of Israel Credit Report
const creditReportSchema = {
  "type": "object",
  "properties": {
    "reportMeta": {
      "type": "object",
      "properties": {
        "subjectFullName": { "type": "string" },
        "nationalId": { "type": "string" },
        "customerType": { "type": "string" },
        "dataCollectionStartDate": { "type": "string", "format": "date" },
        "reportIssueDate": { "type": "string", "format": "date" },
        "sourceSystem": { "type": "string", "default": "BankOfIsraelCreditData" }
      },
      "required": ["subjectFullName", "nationalId", "reportIssueDate"]
    },
    "summary": {
        "type": "object",
        "properties": {
            "totalDebtILS": {"type": "number"},
            "totalDebtExMortgageILS": {"type": "number"},
            "totalLoansCount": {"type": "integer"},
            "totalActiveDealsCount": {"type": "integer"},
            "lenders": {"type": "array", "items": {"type": "string"}}
        }
    },
    "currentAccounts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sourceDisplayName": { "type": "string" },
          "dealId": { "type": "string", "nullable": true },
          "status": { "type": "string", "enum": ["OPEN", "CLOSED"] },
          "creditLimit": { "type": "number", "nullable": true },
          "currentBalance": { "type": "number" },
          "notPaidOnTime": { "type": "number" }
        }
      }
    },
    "loans": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sourceDisplayName": { "type": "string" },
          "dealId": { "type": "string", "nullable": true },
          "status": { "type": "string", "enum": ["ACTIVE", "CLOSED"] },
          "originalPrincipal": { "type": "number" },
          "currentBalance": { "type": "number" }
        }
      }
    },
    "mortgages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sourceDisplayName": { "type": "string" },
          "originalPrincipal": { "type": "number" },
          "currentBalance": { "type": "number" }
        }
      }
    },
    "analysis": {
      "type": "object",
      "properties": {
        "riskScore": { "type": "integer", "minimum": 1, "maximum": 10 },
        "strengths": { "type": "array", "items": { "type": "string" }, "maxItems": 3 },
        "weaknesses": { "type": "array", "items": { "type": "string" }, "maxItems": 3 },
        "recommendations": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["riskScore", "strengths", "weaknesses", "recommendations"]
    }
  },
  "required": ["reportMeta", "summary", "analysis"]
};

// ADD: New, detailed schema for Inventory Report Analysis
const inventoryAnalysisSchema = {
  type: "object",
  properties: {
    extracted_products: {
      type: "array",
      description: "List of all products extracted from the file.",
      items: {
        type: "object",
        properties: {
          barcode: { type: "string" },
          product_name: { type: "string" },
          supplier: { type: "string" },
          category: { type: "string" },
          cost_price: { type: "number" },
          selling_price: { type: "number" },
          inventory: { type: "number" },
          inventory_value: { type: "number" },
        },
        required: ["product_name"]
      }
    },
    summary: {
      type: "object",
      description: "A numerical summary of the inventory report.",
      properties: {
        total_inventory_value: { type: "number" },
        total_products_count: { type: "number" },
        unique_categories_count: { type: "number" },
        average_profit_margin: { type: "number", description: "Average profit margin in percentage, if calculable." }
      },
      required: ["total_inventory_value", "total_products_count"]
    },
    key_insights: {
      type: "array",
      description: "3-5 key textual insights about the inventory in Hebrew.",
      items: { type: "string" }
    },
    actionable_recommendations: {
      type: "array",
      description: "3-5 actionable recommendations for the business owner in Hebrew.",
      items: { type: "string" }
    },
    problematic_products: {
      type: "object",
      description: "Lists of products that require attention.",
      properties: {
        low_stock: { type: "array", items: { type: "string" }, description: "Products with potentially low stock." },
        overstock: { type: "array", items: { type: "string" }, description: "Products with potentially high or excess stock." },
        dead_stock: { type: "array", items: { type: "string" }, description: "Products that appear to have no movement." },
        negative_margin: { type: "array", items: { type: "string" }, description: "Products being sold at a loss." }
      }
    }
  },
  required: ["extracted_products", "summary", "key_insights", "actionable_recommendations"]
};

// ADD: New, detailed schema for Sales Report Analysis
const salesReportSchema = {
  type: "object",
  properties: {
    products_sales: {
      type: "array",
      description: "List of all products sold, extracted from the sales report.",
      items: {
        type: "object",
        properties: {
          item_code: { type: "string" },
          product_name: { type: "string" },
          supplier: { type: "string" },
          category: { type: "string" },
          cost_price: { type: "number" },
          selling_price: { type: "number" },
          items_sold: { type: "number" },
          revenue: { type: "number" },
          gross_profit_percentage: { type: "number" }
        },
        required: ["product_name", "items_sold", "revenue"]
      }
    },
    summary: {
      type: "object",
      description: "A numerical summary of the sales report.",
      properties: {
        total_revenue: { type: "number" },
        total_items_sold: { type: "number" },
        average_profit_margin: { type: "number" },
        unique_products_sold: { type: "number" }
      },
      required: ["total_revenue", "total_items_sold"]
    },
    top_selling_products: {
        type: "array",
        description: "List of top 5 selling products by revenue.",
        items: {
            type: "object",
            properties: {
                product_name: { type: "string" },
                revenue: { type: "number" }
            }
        }
    },
    top_profitable_products: {
        type: "array",
        description: "List of top 5 profitable products by gross profit margin.",
        items: {
            type: "object",
            properties: {
                product_name: { type: "string" },
                profit_percentage: { type: "number" }
            }
        }
    },
    sales_by_category: {
        type: "array",
        description: "Breakdown of sales revenue by product category.",
        items: {
            type: "object",
            properties: {
                category: { type: "string" },
                revenue: { type: "number" }
            }
        }
    },
    key_insights: {
      type: "array",
      description: "3-5 key textual insights about the sales performance in Hebrew.",
      items: { type: "string" }
    },
    actionable_recommendations: {
      type: "array",
      description: "3-5 actionable recommendations for the business owner based on sales data, in Hebrew.",
      items: { type: "string" }
    }
  },
  required: ["products_sales", "summary", "key_insights", "actionable_recommendations"]
};

// ADD: New schema for Promotions Report Analysis
const promotionsReportSchema = {
  type: "object",
  properties: {
    promotions: {
      type: "array",
      description: "List of all promotions extracted from the report.",
      items: {
        type: "object",
        properties: {
          promotion_id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          store: { type: "string" },
          participating_stores: { type: "number" },
          is_active: { type: "boolean" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          promotion_type: { type: "string", enum: ["quantity_deal", "discount", "bundle", "seasonal", "clearance", "other"] }
        },
        required: ["name", "description"]
      }
    },
    summary: {
      type: "object",
      description: "Summary statistics of the promotions report.",
      properties: {
        total_promotions: { type: "number" },
        active_promotions: { type: "number" },
        inactive_promotions: { type: "number" },
        average_stores_per_promotion: { type: "number" },
        most_common_promotion_type: { type: "string" }
      },
      required: ["total_promotions", "active_promotions"]
    },
    promotion_types_breakdown: {
      type: "array",
      description: "Breakdown of promotions by type.",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          count: { type: "number" }
        }
      }
    },
    seasonal_analysis: {
      type: "object",
      description: "Analysis of seasonal trends in promotions.",
      properties: {
        summer_promotions: { type: "number" },
        ongoing_promotions: { type: "number" },
        short_term_promotions: { type: "number" },
        long_term_promotions: { type: "number" }
      }
    }
  },
  required: ["promotions", "summary"]
};

// ADDED: New schema for purchase documents
const purchaseDocumentSchema = {
  type: "object",
  properties: {
    document_type: { type: "string", enum: ["invoice", "delivery_note", "purchase_order", "other"], description: "זהה את סוג המסמך" },
    invoice_number: { type: "string", description: "מספר חשבונית" },
    invoice_date: { type: "string", format: "date", description: "תאריך החשבונית" },
    supplier_name: { type: "string", description: "שם הספק" },
    total_amount: { type: "number", description: "הסכום הכולל לתשלום" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" }
        },
        required: ["description", "quantity", "unit_price"]
      }
    }
  },
  required: ["invoice_number", "invoice_date", "supplier_name", "total_amount"]
};


export default function SpecificFileUploadBox({
  customerEmail,
  category,
  title,
  description,
  required = false,
  icon: Icon,
  onUploadComplete,
  context = {} // Added context prop with a default value
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [finalStatus, setFinalStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    let aiInsightsData = null;
    const file = e.target.files[0];
    if (!file) return;

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    setIsUploading(true);
    setIsProcessing(true);
    setUploadProgress(10);
    setProcessingStatus('מתחיל העלאה...');
    setFinalStatus(null);

    let fileRecordId = null;
    let analysisNotes = '';
    try {
        const { file_url } = await UploadFile({ file: file });
        if (!file_url) {
            throw new Error('Failed to get file URL from upload.');
        }

        setUploadProgress(30);
        setProcessingStatus('יוצר רשומת קובץ...');

        const fileType = file.name.split('.').pop().toLowerCase();
        const initialRecord = await FileUpload.create({
            customer_email: customerEmail,
            filename: file.name,
            file_url: file_url,
            file_type: fileType,
            status: 'processing',
            data_category: category,
        });
        fileRecordId = initialRecord.id;

        setUploadProgress(50);
        setProcessingStatus('מפענח ומנתח את הקובץ...');

        let parseResult;
        let finalMetadata = {};

        if (['xls', 'xlsx', 'csv'].includes(fileType)) {
            if (category === 'inventory_report') {
                setProcessingStatus('מפענח ומנתח דוח מלאי באמצעות AI...');

                try {
                    const { data: parsedXlsxResponse } = await parseXlsx({ fileUrl: file_url });

                    const raw_data = parsedXlsxResponse?.data?.raw_data;

                    if (!raw_data || raw_data.length === 0) {
                        console.error('Failed to read raw data from parsed result:', parsedXlsxResponse);
                        throw new Error('לא הצלחנו לקרוא נתונים מהקובץ או שהקובץ ריק.');
                    }

                    const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

                    const inventoryPrompt = `
                        אתה אנליסט עסקי ומומחה פיננסי עם התמחות בקמעונאות. משימתך היא לנתח את נתוני דוח המלאי הגולמיים המצורפים ולחלץ מהם נתונים ותובנות עסקיות.

                        **הנתונים הגולמיים:**
                        הנתונים מגיעים כמערך של מערכים (JSON array of arrays), המייצג את גיליון האקסל. כל מערך פנימי הוא שורה, וכל פריט במערך הוא תא.

                        **משימותיך:**
                        1.  **זיהוי כותרות:** סרוק את 5-10 השורות הראשונות כדי לזהות את שורת הכותרת האמיתית. שים לב שהכותרות יכולות להופיע בעברית. הכותרות שאתה צריך לחפש הן וריאציות של:
                            *   **שם מוצר:** "שם", "תיאור", "שם פריט"
                            *   **מחיר עלות:** "מחיר קנייה", "עלות"
                            *   **מחיר מכירה:** "מחיר ליחידה (לפני מע\\"מ)", "מחיר לצרכן", "מחיר"
                            *   **כמות במלאי:** "כמות במלאי", "מלאי", "יתרה"
                            *   **ערך מלאי:** "ערך מלאי", "שווי מלאי"
                            *   **ברקוד:** "ברקוד", "מקט"
                            *   **ספק:** "ספק"
                            *   **קטגוריה:** "קטגוריה", "מחלקה"

                        2.  **חילוץ נתונים (extracted_products):** עבור על כל שורת נתונים (לאחר שורת הכותרת) וחלץ את המידע לתוך המערך \`extracted_products\` בסכימת ה-JSON.
                            *   המר את כל הערכים המספריים למספרים (נקה סימני מטבע כמו '₪' ופסיקים).
                            *   אם חסר \`cost_price\` או \`selling_price\` אך יש עמודת "מחיר" כללית, השתמש בה עבור שניהם.
                            *   אם אין ערך בעמודה, השתמש ב-0 למספרים וב-null למחרוזות.

                        3.  **חישוב סיכום (summary):** חשב את סיכום הנתונים המספרי על בסיס המוצרים שחולצו.

                        4.  **הפקת תובנות (key_insights):** ספק 3-5 תובנות מפתח עסקיות בעברית על בסיס הניתוח שלך.

                        5.  **המלצות לפעולה (actionable_recommendations):** ספק 3-5 המלצות קונקרטיות לבעל העסק בעברית.

                        6.  **זיהוי מוצרים בעייתיים (problematic_products):** זהה מוצרים עם מלאי נמוך/עודף, מלאי מת, או רווחיות שלילית.

                        **חשוב מאוד:**
                        *   התעלם משורות ריקות או שורות סיכום.
                        *   כל הטקסט בתגובה (תובנות, המלצות) חייב להיות בעברית.
                        *   הפלט חייב להיות אובייקט JSON שתואם במדויק לסכימה שסופקה.

                        **נתוני האקסל הגולמיים:**
                        ${rawDataForPrompt}
                    `;

                    parseResult = await openRouterAPI({
                        prompt: inventoryPrompt,
                        response_json_schema: inventoryAnalysisSchema
                    });

                    finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
                    analysisNotes = "Successfully analyzed inventory report using AI-First parsing.";

                } catch (llmError) {
                    console.error('Enhanced AI analysis failed:', llmError);
                    const { data } = await parseXlsx({
                        fileUrl: file_url,
                        category: category,
                        filename: file.name
                    });
                    parseResult = data;
                    finalMetadata = { analysis_status: 'partial', enhanced_parsing: false };
                    analysisNotes = "Used basic parsing due to AI analysis failure: " + llmError.message;
                }
            } else if (category === 'sales_report') {
                setProcessingStatus('מפענח ומנתח דוח מכירות באמצעות AI...');

                try {
                    const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });

                    const raw_data = parsedResult?.data?.raw_data;

                    if (!raw_data || raw_data.length === 0) {
                        console.error('Failed to read raw data from parsed result:', parsedResult);
                        throw new Error('לא הצלחנו לקרוא נתונים מדוח המכירות.');
                    }

                    const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

                    const salesPrompt = `
                        אתה אנליסט מכירות ומומחה עסקי עם התמחות בקמעונאות. משימתך היא לנתח את נתוני דוח המכירות הגולמיים המצורפים ולחלץ מהם נתונים, סיכומים, ותובנות עסקיות.

                        **הנתונים הגולמיים:**
                        הנתונים מגיעים כמערך של מערכים (JSON array of arrays), המייצג את גיליון האקסל. כל מערך פנימי הוא שורה, וכל פריט במערך הוא תא.

                        **משימותיך:**
                        1.  **זיהוי כותרות:** סרוק את השורות הראשונות כדי לזהות את שורת הכותרת האמיתית. הכותרות שאתה צריך לחפש הן וריאציות של:
                            *   **שם מוצר:** "תאור", "שם", "שם פריט"
                            *   **קוד פריט:** "קוד פריט"
                            *   **מחיר עלות:** "מחיר עלות (כולל מע\\"מ)"
                            *   **מחיר מכירה:** "מחיר לצרכן"
                            *   **כמות שנמכרה:** "כמות פריטים שנמכרו"
                            *   **פדיון:** "פדיון"
                            *   **אחוז רווח:** "אחוז רווח גולמי"
                            *   **קטגוריה:** "קטגוריה ראשית"
                            *   **ספק:** "ספק"

                        2.  **חילוץ נתונים (products_sales):** עבור על כל שורת נתונים וחלץ את המידע לתוך המערך \`products_sales\` בסכימת ה-JSON. המר את כל הערכים המספריים למספרים.

                        3.  **חישוב סיכום (summary):** חשב את סיכום הנתונים על בסיס הנתונים שחולצו (סך פדיון, סך פריטים וכו').

                        4.  **זיהוי מובילים:** זהה את המוצרים הנמכרים ביותר (לפי פדיון) והרווחיים ביותר (לפי אחוז רווח).

                        5.  **ניתוח קטגוריות:** חשב את הפדיון לכל קטגוריה.

                        6.  **הפקת תובנות (key_insights):** ספק 3-5 תובנות מפתח עסקיות בעברית על ביצועי המכירות.

                        7.  **המלצות לפעולה (actionable_recommendations):** ספק 3-5 המלצות קונקרטיות לבעל העסק בעברית.

                        **חשוב מאוד:**
                        *   התעלם משורות ריקות או שורות סיכום.
                        *   כל הטקסט בתגובה (תובנות, המלצות) חייב להיות בעברית.
                        *   הפלט חייב להיות אובייקט JSON שתואם במדויק לסכימה שסופקה.

                        **נתוני האקסל הגולמיים:**
                        ${rawDataForPrompt}
                    `;

                    parseResult = await openRouterAPI({
                        prompt: salesPrompt,
                        response_json_schema: salesReportSchema
                    });

                    finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
                    analysisNotes = "Successfully analyzed sales report using AI-First parsing.";

                } catch (llmError) {
                    console.error('Sales report AI analysis failed:', llmError);
                    analysisNotes = "ניתוח דוח המכירות נכשל: " + llmError.message;
                    throw new Error(analysisNotes);
                }
            } else if (category === 'promotions_report') {
                setProcessingStatus('מפענח ומנתח דוח מבצעים באמצעות AI...');

                try {
                    const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });

                    const raw_data = parsedResult?.data?.raw_data;

                    if (!raw_data || raw_data.length === 0) {
                        console.error('Failed to read raw data from parsed result:', parsedResult);
                        throw new Error('לא הצלחנו לקרוא נתונים מדוח המבצעים.');
                    }

                    const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

                    const promotionsPrompt = `
                        אתה אנליסט שיווק ומומחה במבצעים ואסטרטגיית תמחור. משימתך היא לנתח את נתוני דוח המבצעים הגולמיים המצורפים ולחלץ מהם נתונים ותובנות עסקיות.

                        **הנתונים הגולמיים:**
                        הנתונים מגיעים כמערך של מערכים (JSON array of arrays), המייצג את גיליון האקסל. כל מערך פנימי הוא שורה, וכל פריט במערך הוא תא.

                        **משימותיך:**
                        1.  **זיהוי כותרות:** סרוק את השורות הראשונות כדי לזהות את שורת הכותרת האמיתית. הכותרות שאתה צריך לחפש הן:
                            *   **מזהה מבצע:** "מזהה", "ID", "קוד מבצע"
                            *   **שם המבצע:** "שם", "שם המבצע", "כותרת"
                            *   **תיאור:** "תיאור", "פרטים", "הסבר"
                            *   **חנות:** "חנות שהגדירה", "חנות", "סניף"
                            *   **מספר חנויות:** "מספר חנויות משתתפות", "חנויות"
                            *   **סטטוס:** "מבצע פעיל", "פעיל", "סטטוס"
                            *   **תאריך התחלה:** "תאריך תחילה", "התחלה", "מתאריך"
                            *   **תאריך סיום:** "תאריך סיום", "סיום", "עד תאריך"

                        2.  **חילוץ נתונים (promotions):** עבור על כל שורת נתונים (לאחר שורת הכותרת) וחלץ את המידע לתוך המערך \`promotions\` בסכימת ה-JSON.
                            *   זהה את סוג המבצע על בסיס השם והתיאור (quantity_deal עבור "X ב-Y", discount עבור הנחות, bundle עבור חבילות, seasonal עבור פינוי מלאי).
                            *   המר "כן"/"לא" ל-true/false עבור השדה is_active.
                            *   נרמל תאריכים לפורמט אחיד.

                        3.  **חישוב סיכום (summary):** חשב סטטיסטיקות כלליות על בסיס המבצעים שחולצו.

                        4.  **ניתוח סוגי מבצעים (promotion_types_breakdown):** קטלג את המבצעים לפי סוגים וספור כל סוג.

                        5.  **ניתוח עונתי (seasonal_analysis):** נתח מגמות עונתיות ומשכי מבצעים.

                        6.  **הפקת תובנות (key_insights): Privilege Hebrew insights.** ספק 3-5 תובנות מפתח אסטרטגיות בעברית על אסטרטגיית המבצעים.

                        7.  **המלצות לפעולה (actionable_recommendations): Privilege Hebrew recommendations.** ספק 3-5 המלצות קונקרטיות לשיפור אסטרטגיית המבצעים בעברית.

                        **חשוב מאוד:**
                        *   התעלם משורות ריקות או שורות כותרת נוספות.
                        *   כל הטקסט בתגובה (תובנות, המלצות) חייב להיות בעברית.
                        *   הפלט חייב להיות אובייקט JSON שתואם במדויק לסכימה שסופקה.

                        **נתוני האקסל הגולמיים:**
                        ${rawDataForPrompt}
                    `;

                    parseResult = await openRouterAPI({
                        prompt: promotionsPrompt,
                        response_json_schema: promotionsReportSchema
                    });

                    finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
                    analysisNotes = "Successfully analyzed promotions report using AI-First parsing.";

                } catch (llmError) {
                    console.error('Promotions report AI analysis failed:', llmError);
                    analysisNotes = "ניתוח דוח המבצעים נכשל: " + llmError.message;
                    throw new Error(analysisNotes);
                }
            } else if (category === 'balance_sheet') { // NEW: Add balance sheet XLSX analysis
                setProcessingStatus('מפענח ומנתח מאזן בוחן באמצעות AI...');

                try {
                    // שלב 1: קרא נתונים גולמיים מקובץ האקסל
                    const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });

                    const raw_data = parsedResult?.data?.raw_data;

                    if (!raw_data || raw_data.length === 0) {
                        console.error('Failed to read raw data from parsed result:', parsedResult);
                        throw new Error('לא הצלחנו לקרוא נתונים ממאזן הבוחן.');
                    }

                    // הכן את הנתונים הגולמיים כטקסט JSON עבור ה-LLM
                    const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

                    const balanceSheetPrompt = `
                        אתה אנליסט פיננסי מומחה. משימתך היא לנתח את נתוני מאזן הבוחן הגולמיים המצורפים ולחלץ מהם נתונים פיננסיים מובנים ותובנות עסקיות.

                        **הנתונים הגולמיים:**
                        הנתונים מגיעים כמערך של מערכים (JSON array of arrays), המייצג את גיליון האקסל. כל מערך פנימי הוא שורה, וכל פריט במערך הוא תא.

                        **מבנה מאזן בוחן:**
                        מאזן בוחן מכיל בדרך כלל קבוצות של חשבונות כגון:
                        - הכנסות (בעמודת "זכות" או כסכומים שליליים)
                        - קניות/עלות מכירות (בעמודת "חובה")
                        - הוצאות תפעוליות (בעמודת "חובה")
                        - הוצאות שכר (בעמודת "חובה")

                        **משימותיך:**
                        1.  **זיהוי כותרות:** סרוק את השורות הראשונות כדי לזהות את שורת הכותרת האמיתית. הכותרות שאתה צריך לחפש הן:
                            *   **שם חשבון:** "שם חשבון", "תיאור", "פירוט"
                            *   **חובה:** "חובה", "דביט"
                            *   **זכות:** "זכות", "קרדיט"
                            *   **הפרש/יתרה:** "הפרש", "יתרה", "מאזן"

                        2.  **זיהוי וחילוץ נתונים פיננסיים:**
                            *   **הכנסות:** חפש קבוצות או שורות עם מילים כמו "הכנסות" שבדרך כלל יופיעו בעמודת "זכות"
                            *   **עלות מכירות:** חפש "קניות", "עלות מכירות", "COGS" - בדרך כלל בעמודת "חובה"
                            *   **הוצאות תפעוליות:** חפש "הוצאות" (לא כולל שכר) - בעמודת "חובה"
                            *   **הוצאות שכר:** חפש "שכר", "ביטוח לאומי", "סוציאליות" - בעמודת "חובה"

                        3.  **חישוב נתונים כספיים מרכזיים:**
                            *   סכם את כל ההכנסות (מעמודת "זכות")
                            *   סכם את עלויות המכירות/קניות
                            *   חשב רווח גולמי = הכנסות - עלות מכירות
                            *   סכם הוצאות תפעוליות (ללא שכר)
                            *   סכם הוצאות שכר (כולל נלוות)
                            *   חשב רווח תפעולי = רווח גולמי - הוצאות תפעוליות - הוצאות שכר
                            *   חשב יחסי רווחיות

                        4.  **מטא-דטה של הדוח:**
                            *   חפש שם החברה (בדרך כלל בשורות הראשונות)
                            *   חפש תאריך הדוח או תקופת הדוח

                        5.  **הפקת תובנות (key_insights):** ספק 4-6 תובנות מפתח עסקיות בעברית על בסיס הניתוח שלך.

                        6.  **התראות והמלצות (alerts_and_insights):** ספק המלצות מפורטות בעברית עבור:
                            *   מגמות חיוביות שזוהו
                            *   תחומים הדורשים תשומת לב
                            *   המלצות קונקרטיות לשיפור

                        **חשוב מאוד:**
                        *   התעלם משורות ריקות או שורות כותרת נוספות.
                        *   כל הטקסט בתגובה (תובנות, המלצות) חייב להיות בעברית.
                        *   הפלט חייב להיות אובייקט JSON שתואם במדויק לסכימה שסופקה.
                        *   אם אינך מוצא נתון מספרי ספציפי, השתמש ב-null או 0.

                        **נתוני האקסל הגולמיים:**
                        ${rawDataForPrompt}
                    `;

                    parseResult = await openRouterAPI({
                        prompt: balanceSheetPrompt,
                        response_json_schema: detailedBalanceSheetSchema
                    });

                    finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
                    analysisNotes = "Successfully analyzed balance sheet XLSX using AI-First parsing.";

                } catch (llmError) {
                    console.error('Balance sheet XLSX AI analysis failed:', llmError);
                    analysisNotes = "ניתוח מאזן הבוחן נכשל: " + llmError.message;
                    throw new Error(analysisNotes);
                }
            } else if (category === 'profit_loss_statement') {
                setProcessingStatus('מפענח ומנתח דוח רווח והפסד באמצעות AI...');

                try {
                    const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });

                    const raw_data = parsedResult?.data?.raw_data;

                    if (!raw_data || raw_data.length === 0) {
                        console.error('Failed to read raw data from parsed result:', parsedResult);
                        throw new Error('לא הצלחנו לקרוא נתונים מדוח הרווח והפסד.');
                    }

                    const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

                    const profitLossPrompt = `
                        אתה אנליסט פיננסי מומחה. משימתך היא לנתח את נתוני דוח רווח והפסד (P&L) הגולמיים המצורפים ולחלץ מהם נתונים פיננסיים מובנים ותובנות עסקיות.

                        **הנתונים הגולמיים:**
                        הנתונים מגיעים כמערך של מערכים (JSON array of arrays), המייצג את גיליון האקסל. כל מערך פנימי הוא שורה, וכל פריט במערך הוא תא.

                        **מבנה דוח רווח והפסד:**
                        דוח רווח והפסד מכיל בדרך כלל קבוצות של חשבונות כגון:
                        - הכנסות (sales, revenue)
                        - עלות מכירות (COGS)
                        - הוצאות תפעוליות (operating expenses: salaries, rent, marketing)
                        - רווח תפעולי
                        - הוצאות מימון (financing expenses)
                        - רווח נקי (net profit)

                        **משימותיך:**
                        1.  **זיהוי כותרות:** סרוק את השורות הראשונות כדי לזהות את שורת הכותרת האמיתית.
                        2.  **חילוץ נתונים פיננסיים:** זהה והפק את הנתונים הפיננסיים העיקריים.
                        3.  **חישוב נתונים כספיים מרכזיים:** סכם הכנסות, הוצאות, רווח גולמי ורווח נקי.
                        4.  **מטא-דטה של הדוח:** חפש שם החברה ותקופת הדוח.
                        5.  **הפקת תובנות:** ספק 4-6 תובנות מפתח עסקיות בעברית.
                        6.  **התראות והמלצות:** ספק המלצות מפורטות בעברית.

                        **חשוב מאוד:**
                        *   כל הטקסט בתגובה (תובנות, המלצות) חייב להיות בעברית.
                        *   הפלט חייב להיות אובייקט JSON שתואם במדויק לסכימה שסופקה.
                        *   אם אינך מוצא נתון מספרי ספציפי, השתמש ב-null או 0.

                        **נתוני האקסל הגולמיים:**
                        ${rawDataForPrompt}
                    `;

                    parseResult = await openRouterAPI({
                        prompt: profitLossPrompt,
                        response_json_schema: detailedProfitLossSchema
                    });

                    finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
                    analysisNotes = "Successfully analyzed Profit & Loss XLSX using AI-First parsing.";

                } catch (llmError) {
                    console.error('Profit Loss XLSX AI analysis failed:', llmError);
                    // SPECIFIC FALLBACK FOR profit_loss_statement ONLY
                    const { data: basicXlsxParseResult } = await parseXlsx({ fileUrl: file_url });
                    parseResult = {
                        raw_data: basicXlsxParseResult.raw_data,
                        headers: basicXlsxParseResult.headers || [],
                        rows: basicXlsxParseResult.rows || [],
                        summary: null,
                        flags: [],
                        breakdown: null
                    };
                    finalMetadata = { analysis_status: 'partial', enhanced_parsing: false };
                    analysisNotes = "ניתוח דוח רווח והפסד נכשל, נשמר קובץ גולמי: " + llmError.message;
                }
            } else {
                const { data } = await parseXlsx({
                    fileUrl: file_url,
                    category: category,
                    filename: file.name
                });
                parseResult = data;
                finalMetadata = { analysis_status: 'full' };
                analysisNotes = "Successfully parsed Excel/CSV file.";
            }
        } else if (fileType === 'pdf' || ['jpg', 'jpeg', 'png'].includes(fileType)) {
            let targetSchema;
            let prompt;

            setProcessingStatus(fileType === 'pdf' ? 'מנתח מסמך PDF באמצעות AI...' : 'מנתח תמונה באמצעות AI...');

            // ADDED: Logic for purchase_document PDF
            if (category === 'purchase_document') {
                setProcessingStatus('מעבד מסמך רכש...');
                setUploadProgress(50); // Set progress for the process

                try {
                    await processPurchaseDocument({
                        file_url: file_url,
                        customer_email: customerEmail,
                        file_id: fileRecordId,
                        supplier_id: context.supplier_id || null // Using supplier_id from context
                    });

                    setProcessingStatus('מסמך רכש עובד בהצלחה!');
                    setUploadProgress(100);
                    setFinalStatus('success');
                    
                    if (onUploadComplete) {
                        onUploadComplete();
                    }
                    
                    return; // Return early as the backend function handles DB updates
                } catch (error) {
                    console.error('Purchase document processing error:', error);
                    setProcessingStatus(`שגיאה בעיבוד מסמך רכש: ${error.message}`);
                    setFinalStatus('error');
                    throw error; // Propagate error to outer catch for file status update
                }
            } else if (category === 'bank_statement') {
              targetSchema = bankStatementSchema;
              prompt = `
                Please analyze the provided bank statement PDF (focus on the first 10 pages) and extract the following information into the JSON schema:
                1.  **account_summary**: Basic details about the account and its balances.
                2.  **transactions**: A list of all transactions with their date, description, credit amount, debit amount, and final balance.
                3.  **key_insights**: Generate 3-5 key financial insights from the statement in Hebrew. Focus on trends, unusual activities, or significant changes.
                4.  **risk_flags**: Identify any potential financial risks or red flags based on the transactions in Hebrew (e.g., overdrafts, high fees, large unexpected withdrawals, consistent negative balance).
                5.  **top_expenses**: List the top 5 largest expenses (debits) from the statement, including their description and amount.

                IMPORTANT:
                - All text fields including key_insights, risk_flags, and top_expenses descriptions MUST be in Hebrew.
                - Translate all insights and flags to Hebrew.
                - Ensure all extracted data and insights are accurate and directly derived from the document.
                - Ensure all string values in the JSON output are valid and properly escaped, without any control characters or invalid Unicode. If any extracted text contains such characters, clean or omit them to ensure valid JSON.
                - If you cannot extract a specific value, use appropriate defaults: empty string "" for text fields, 0 for numeric fields.
                `;
                finalMetadata = { analysis_status: 'partial', pages_analyzed: 10 };
                analysisNotes = 'Analyzed first 10 pages of bank statement PDF.';

            } else if (category === 'credit_card_report') {
              targetSchema = creditCardSchema;
              prompt = `
                Please analyze the provided credit card statement PDF (focus on the first 10 pages) and extract the following information into the JSON schema:
                1.  **card_summary**: Basic details about the card and billing period totals.
                2.  **transactions**: A list of all transactions with their date, merchant, category, and billed amount.
                3.  **key_insights**: Generate 3-5 key spending insights from the credit card statement in Hebrew. Focus on spending patterns, significant purchases, or unusual activities.
                4.  **top_spending_categories**: List the top 3-5 spending categories (e.g., dining, travel, shopping, utilities) based on the transactions and their total amounts. If categories are not explicitly provided in the PDF, infer them based on merchant names.
                IMPORTANT: All text fields including key_insights, risk_flags, and top_expenses descriptions MUST be in Hebrew.
                Translate all insights and flags to Hebrew.
                Ensure all extracted data and insights are accurate and directly derived from the document.
                `;
                finalMetadata = { analysis_status: 'partial', pages_analyzed: 10 };
                analysisNotes = 'Analyzed first 10 pages of credit card report PDF.';

            } else if (category === 'credit_report') {
              targetSchema = creditReportSchema;
              prompt = `
                אתה Extractor & Analyst פיננסי מומחה. קבל קובץ PDF בעברית של "דוח ריכוז נתונים" מבנק ישראל ומשימתך היא למצות את כל הנתונים הפיננסיים הרלוונטיים ולהפיק ניתוח ותובנות. החזר אובייקט JSON תקני התואם במדויק לסכימה שסופקה.
                כללי פענוח ונרמול חשובים:
                1. מספרים: הסר פסיקים.
                2. תאריכים: נרמל לפורמט YYYY-MM-DD.
                3. מיצוי עקבי: חלץ את כל הישויות כולל חשבונות עו"ש, הלוואות, משכנתאות, מסגרות אשראי, בטחונות, והיסטוריית פיגורים.
                4. תובנות AI: חובה לספק את האובייקט 'analysis' המכיל:
                   - riskScore: הערכת סיכון פיננסי מ-1 (נמוך) עד 10 (גבוה).
                   - strengths: 3 נקודות חוזק מרכזיות בהתנהלות הפיננסית.
                   - weaknesses: 3 נקודות חולשה מרכזיות.
                   - recommendations: המלצות קונקרטיות לשיפור.
                ודא שהפלט שלך הוא JSON חוקי שתואם במלואו לסכימה.
                **כל התובנות וטקסט חופשי אחר שתפיק חייבים להיות בעברית בלבד.**

              `;
              finalMetadata = { analysis_status: 'full' };
              analysisNotes = 'Successfully analyzed Bank of Israel Credit Report PDF.';

            } else if (category === 'balance_sheet') {
              targetSchema = detailedBalanceSheetSchema;
              prompt = `
                You are an expert financial analyst. Analyze the provided Balance Sheet (מאזן בוחן) PDF.
                Extract ALL data accurately into the provided JSON schema. Ensure all numeric values are parsed correctly without commas.
                Pay close attention to debit (חובה) and credit (זכות) columns to correctly assign revenues and expenses.
                Calculate all financial ratios and generate key insights as defined in the schema.
                IMPORTANT: All text fields including key_insights, positive_trends, areas_for_attention, and recommendations MUST be in Hebrew.
                Translate all insights and recommendations to Hebrew.
                If a field is not present in the document, return null for that field.
                The report language is Hebrew.
              `;
              finalMetadata = { analysis_status: 'full' };
              analysisNotes = 'Successfully analyzed full Balance Sheet PDF.';

            } else if (category === 'profit_loss_statement') {
              targetSchema = detailedProfitLossSchema;
              prompt = `
                You are an expert financial analyst. Analyze the provided Profit & Loss (P&L) statement PDF.
                Extract ALL data accurately into the provided JSON schema. Ensure all numeric values are parsed correctly without commas.
                Calculate all financial ratios and projections as defined in the schema.
                Provide concise and actionable alerts and insights based on the data.
                IMPORTANT: All text fields including key_insights, positive_trends, areas_for_attention, and recommendations MUST be in Hebrew.
                Translate all insights and recommendations to Hebrew.
                If a field is not present in the document, return null for that field.
                The report language is Hebrew.
              `;
              finalMetadata = { analysis_status: 'full' };
              analysisNotes = 'Successfully analyzed full Profit & Loss Statement PDF.';

            } else if (category === 'esna_report') {
              console.log('Processing ESNA report file');
              setProcessingStatus('מעבד דוח מע"מ (ESNA)...');
              setUploadProgress(50); // Corrected `setProgress` to `setUploadProgress`

              try {
                const { data: processResult, error: processError } = await processESNAReport({ // Corrected destructuring
                  file_url: file_url, // Corrected `uploadedFile.url` to `file_url`
                  customer_email: customerEmail,
                  file_id: fileRecordId // Corrected `fileRecord.id` to `fileRecordId`
                });

                if (processError || !processResult || !processResult.success) { // Corrected condition
                  throw new Error(processError?.message || processResult?.error || 'עיבוד דוח מע"מ נכשל');
                }

                setProcessingStatus('דוח מע"מ עובד בהצלחה!');
                setUploadProgress(100);
                setFinalStatus('success'); // Corrected `setIsError` to `setFinalStatus` and removed `onUploadComplete`
                return; // Added return to prevent further processing in this function as ESNA is self-contained.
              } catch (error) {
                console.error('ESNA processing error:', error);
                setProcessingStatus(`שגיאה בעיבוד דוח מע"מ: ${error.message}`);
                setFinalStatus('error'); // Corrected `setIsError` to `setFinalStatus`
                throw error; // Propagate error to outer catch for file status update
              }
            } else {
                throw new Error("Unsupported PDF category for analysis.");
            }

            try {
                // This block is for categories processed by openRouterAPI
                parseResult = await openRouterAPI({
                    prompt: prompt,
                    file_urls: [file_url],
                    response_json_schema: targetSchema
                });
            } catch (llmError) {
                console.error('LLM analysis failed:', llmError);
                analysisNotes = `ניתוח ה-PDF נכשל: ${llmError.message}`;
                throw new Error(analysisNotes);
            }
        } else {
            throw new Error(`Unsupported file type: ${fileType}. Only .xls, .xlsx, .csv, and .pdf are supported.`);
        }

        if (!parseResult) {
            throw new Error('Parsing returned no result.');
        }

        setUploadProgress(90);
        setProcessingStatus('שומר תוצאות ניתוח...');

        let dataToSaveInParsedData;
        let dataToSaveInAiInsights = parseResult; // Default: save full LLM output to AI insights

        // Common handling for detailed financial reports (Balance Sheet)
        if (category === 'balance_sheet') {
            dataToSaveInParsedData = {
                summary: "Balance Sheet Analysis",
                rows: [], // Structured reports don't have traditional rows
                headers: ['קטגוריה', 'סכום', 'אחוז מההכנסות'], // Placeholder headers
                flags: parseResult.alerts_and_insights?.areas_for_attention || [],
                report_metadata: parseResult.report_metadata,
                financial_summary: parseResult.financial_summary,
                profitability_ratios: parseResult.profitability_ratios,
                alerts_and_insights: parseResult.alerts_and_insights,
                key_insights: parseResult.key_insights || []
            };

            dataToSaveInParsedData.breakdown = {
                revenue: parseResult.revenue_breakdown,
                expenses: parseResult.expense_breakdown
            };
        } else if (category === 'profit_loss_statement') { // SPECIFIC HANDLING FOR profit_loss_statement
            if (parseResult.report_metadata && parseResult.financial_summary) {
                // AI parsing succeeded for P&L (from PDF or XLSX)
                dataToSaveInParsedData = {
                    summary: JSON.stringify(parseResult.financial_summary),
                    rows: [],
                    headers: ['קטגוריה', 'סכום', 'אחוז מההכנסות'],
                    flags: parseResult.alerts_and_insights?.areas_for_attention || [],
                    report_metadata: parseResult.report_metadata,
                    financial_summary: parseResult.financial_summary,
                    profitability_ratios: parseResult.profitability_ratios,
                    alerts_and_insights: parseResult.alerts_and_insights,
                    key_insights: parseResult.alerts_and_insights?.cost_alerts || parseResult.key_insights || []
                };
                dataToSaveInParsedData.breakdown = parseResult.cost_structure_analysis;
            } else if (parseResult.raw_data) {
                // AI parsing failed for P&L XLSX, using raw data
                dataToSaveInParsedData = {
                    headers: parseResult.raw_data[0] || [],
                    rows: parseResult.raw_data.slice(1),
                    summary: null,
                    flags: [],
                    breakdown: null,
                    raw_data: parseResult.raw_data
                };
                dataToSaveInAiInsights = { error: analysisNotes, raw_data: parseResult.raw_data };
            }
        } else if (category === 'inventory_report' && parseResult.extracted_products) {
            dataToSaveInParsedData = {
                rows: parseResult.extracted_products,
                headers: Object.keys(parseResult.extracted_products[0] || {}),
                summary: JSON.stringify(parseResult.summary),
            };
        } else if (category === 'sales_report' && parseResult.products_sales) {
            dataToSaveInParsedData = {
                rows: parseResult.products_sales,
                headers: Object.keys(parseResult.products_sales[0] || {}),
                summary: JSON.stringify(parseResult.summary),
                top_selling_products: parseResult.top_selling_products,
                top_profitable_products: parseResult.top_profitable_products,
                sales_by_category: parseResult.sales_by_category
            };
        } else if (category === 'promotions_report' && parseResult.promotions) {
            dataToSaveInParsedData = {
                rows: parseResult.promotions,
                headers: Object.keys(parseResult.promotions[0] || {}),
                summary: JSON.stringify(parseResult.summary),
                promotion_types_breakdown: parseResult.promotion_types_breakdown,
                seasonal_analysis: parseResult.seasonal_analysis
            };
        } else if (category === 'credit_report') {
            dataToSaveInParsedData = { ...parseResult };
            delete dataToSaveInParsedData.analysis; // Remove 'analysis' from parsed_data
        } else if (
            category === 'credit_card_report' &&
            parseResult.card_summary &&
            Array.isArray(parseResult.transactions)
        ) {
            dataToSaveInParsedData = {
                card_summary: parseResult.card_summary,
                transactions: parseResult.transactions,
                summary: JSON.stringify(parseResult.card_summary),
                rows: parseResult.transactions,
                headers: Object.keys(parseResult.transactions[0] || {}),
                flags: parseResult.risk_flags || [],
                key_insights: parseResult.key_insights || [],
                top_spending_categories: parseResult.top_spending_categories || [],
                breakdown: null
            };
        } else if (
            category === 'bank_statement' &&
            parseResult?.account_summary &&
            Array.isArray(parseResult?.transactions) &&
            parseResult.transactions.length > 0
        ) {
            dataToSaveInParsedData = {
                account_summary: parseResult.account_summary,
                transactions: parseResult.transactions,
                summary: JSON.stringify(parseResult.account_summary),
                rows: parseResult.transactions,
                headers: Object.keys(parseResult.transactions[0] || {}),
                flags: parseResult.risk_flags || [],
                key_insights: parseResult.key_insights || [],
                top_expenses: parseResult.top_expenses || [],
                breakdown: null
            };
        } else {
            // Fallback for any other successful parsing result not explicitly handled
            dataToSaveInParsedData = parseResult;
        }

        // If dataToSaveInParsedData is still null or undefined for some reason, assign parseResult directly
        if (!dataToSaveInParsedData) {
            dataToSaveInParsedData = parseResult;
        }

        await FileUpload.update(fileRecordId, {
            status: 'analyzed',
            parsed_data: dataToSaveInParsedData,
            ai_insights: dataToSaveInAiInsights,
            parsing_metadata: finalMetadata,
            analysis_notes: analysisNotes
        });

        setUploadProgress(100);
        setProcessingStatus('ההעלאה והניתוח הושלמו!');
        setFinalStatus('success');

        if (onUploadComplete) {
            onUploadComplete();
        }

    } catch (err) {
        console.error('File upload process failed:', err);
        const displayMessage = analysisNotes || err.message || 'אירעה שגיאה לא ידועה';
        
        // עדכון רשומת הקובץ עם פרטי השגיאה
        if (fileRecordId) {
            try {
                await FileUpload.update(fileRecordId, { 
                    status: 'failed', 
                    analysis_notes: displayMessage,
                    error_message: err.message || displayMessage
                });
            } catch (updateError) {
                console.error('Error updating file record:', updateError);
            }
        } else {
            // אם אין fileRecordId, ניצור רשומה חדשה
            try {
                await FileUpload.create({
                    filename: file?.name || 'קובץ לא מזוהה',
                    file_url: file_url || '',
                    file_type: file?.name?.split('.').pop()?.toLowerCase() || 'unknown',
                    status: 'failed',
                    data_category: selectedCategory || 'unknown',
                    analysis_notes: displayMessage,
                    error_message: err.message || displayMessage
                });
            } catch (createError) {
                console.error('Error creating failed file record:', createError);
            }
        }
        
        // הודעה ידידותית למשתמש
        toast.error('⚠️ הקובץ לא הועלה בהצלחה\n\nהקובץ הועבר לטיפול מנהל המערכת ונבדק בהקדם.\nתוכל לראות את הסטטוס בעדכונים שיישלחו אליך.');
        setProcessingStatus('הקובץ הועבר לטיפול מנהל המערכת');
        setFinalStatus('error');
    } finally {
        setIsUploading(false);
        setIsProcessing(false);
        setTimeout(() => {
            setUploadProgress(0);
            setProcessingStatus('');
            setFinalStatus(null);
        }, 3000);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const mockEvent = { target: { files: [files[0]] } };
      await handleFileUpload(mockEvent);
    }
  };

  const isSuccess = finalStatus === 'success';
  const isError = finalStatus === 'error';

  return (
    <Card
      className={`card-horizon transition-all duration-300 ease-in-out ${
        isUploading ? 'border-horizon-primary' : isDragging ? 'border-horizon-secondary border-dashed bg-horizon-secondary/5' : 'hover:border-horizon-primary'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
        <div className={`p-3 rounded-full mb-3 ${isUploading ? 'bg-horizon-primary/20' : 'bg-horizon-primary/10'}`}>
          <Icon className={`w-6 h-6 ${isUploading ? 'text-horizon-primary animate-pulse' : 'text-horizon-primary'}`} />
        </div>
        <CardTitle className="text-lg text-horizon-text font-semibold mb-1">{title}</CardTitle>
        <p className="text-sm text-horizon-accent mb-4 line-clamp-2">
          {isDragging ? 'שחרר כאן את הקובץ...' : description}
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xls,.xlsx,.csv,.pdf,.jpg,.jpeg,.png"
          className="hidden"
          disabled={isUploading}
        />
        <Button
          onClick={triggerFileSelect}
          disabled={isUploading}
          className="btn-horizon-primary w-full"
        >
          {isUploading && !finalStatus ? (
            <>
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              {processingStatus}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 ml-2" />
              {isDragging ? 'שחרר לכאן' : 'העלה קובץ'}
            </>
          )}
        </Button>
        {!isUploading && !isDragging && (
          <p className="text-xs text-horizon-accent mt-3">או גרור ושחרר קובץ לכאן</p>
        )}
        {isUploading && !isSuccess && !isError && (
          <p className="text-sm text-horizon-accent mt-2">{processingStatus}</p>
        )}
        {isSuccess && (
          <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {processingStatus}
          </p>
        )}
        {isError && (
          <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
            <XCircle className="w-4 h-4" />
            {processingStatus}
          </p>
        )}
      </CardContent>
    </Card>
  );
}