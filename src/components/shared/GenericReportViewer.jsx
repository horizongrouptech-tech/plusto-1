
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import { Lightbulb, AlertCircle } from 'lucide-react';

export default function GenericReportViewer({ fileData }) {
  if (!fileData) {
    // Handle cases where fileData might not be available yet
    return <div className="text-center py-10 text-horizon-accent">טוען נתונים...</div>;
  }

  const { parsed_data, ai_insights } = fileData;

  // Destructure parsed_data for easier access, providing default empty values
  const headers = parsed_data?.headers || [];
  const rows = parsed_data?.rows || [];
  const summary = parsed_data?.summary || {};
  const flags = parsed_data?.flags || [];

  const hasParsedData = parsed_data && (rows.length > 0 || Object.keys(summary).length > 0 || flags.length > 0);
  const hasInsights = ai_insights && Object.keys(ai_insights).length > 0;

  return (
    <div className="p-6 bg-horizon-card rounded-lg" dir="rtl">
      {/* AI Insights Section */}
      {hasInsights && (
        <div className="mb-6">
          <Card className="bg-horizon-card/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-horizon-text">
                <Lightbulb className="w-5 h-5 text-horizon-accent" />
                תובנות AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(ai_insights).map(([key, value]) => (
                <div key={key} className="p-3 bg-horizon-card rounded-lg">
                  <p className="font-bold text-horizon-accent capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                  <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-horizon-text">{value}</ReactMarkdown>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary (if exists) */}
      {hasParsedData && summary && Object.keys(summary).length > 0 && (
        <div className="mb-6">
          <Card className="bg-horizon-card/30">
            <CardHeader>
              <CardTitle className="text-horizon-text">סיכום הדוח</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="p-3 bg-horizon-card rounded-lg">
                  <p className="text-sm text-horizon-accent capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="font-bold text-horizon-text text-lg">{value.toString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Flags/Alerts */}
      {hasParsedData && flags && flags.length > 0 && (
        <div className="mb-6">
          <Card className="bg-red-500/10 border border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                התראות שזוהו
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-red-300">
                {flags.map((flag, index) => (
                  <li key={index}>{flag}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table */}
      {hasParsedData && rows.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-horizon-text mb-4">נתונים שחולצו</h3>
          <div className="overflow-auto max-h-[60vh] border border-horizon rounded-lg">
            <table className="w-full text-sm text-left text-horizon-accent">
              <thead className="text-xs text-horizon-text uppercase bg-horizon-card sticky top-0 z-10">
                <tr>
                  {headers.map(header => (
                    <th key={header} scope="col" className="px-6 py-3 text-right">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="bg-horizon-dark border-b border-horizon hover:bg-horizon-card/30">
                    {headers.map(header => (
                      <td key={`${rowIndex}-${header}`} className="px-6 py-4 text-right">
                        {row[header] !== undefined && row[header] !== null ? row[header].toString() : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data or Insights Message */}
      {!hasParsedData && !hasInsights && (
        <div className="text-center py-10 text-horizon-accent">
          לא נמצאו נתונים או תובנות להצגה עבור דוח זה.
        </div>
      )}
    </div>
  );
}
