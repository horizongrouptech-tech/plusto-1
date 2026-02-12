
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, Send, Building, Link as LinkIcon, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function ContactPage() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Add form submission logic here if needed (e.g., send email via integration)
    toast.success("ההודעה נשלחה בהצלחה!");
    e.target.reset();
  };

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Phone className="w-20 h-20 mx-auto mb-4 text-horizon-primary" />
          <h1 className="text-4xl font-bold mb-3">צור קשר</h1>
          <p className="text-lg text-horizon-accent">אנחנו כאן לכל שאלה, הצעה או תמיכה שתצטרך.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="card-horizon shadow-horizon-strong">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-horizon-primary flex items-center gap-2">
                <Send className="w-6 h-6" />
                שלח לנו הודעה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-horizon-accent">שם מלא</Label>
                  <Input id="name" placeholder="הכנס שם מלא" required className="bg-horizon-card border-horizon text-horizon-text"/>
                </div>
                <div>
                  <Label htmlFor="email" className="text-horizon-accent">כתובת מייל</Label>
                  <Input id="email" type="email" placeholder="your@email.com" required className="bg-horizon-card border-horizon text-horizon-text"/>
                </div>
                <div>
                  <Label htmlFor="subject" className="text-horizon-accent">נושא הפנייה</Label>
                  <Input id="subject" placeholder="לדוגמה: שאלה על המלצה" required className="bg-horizon-card border-horizon text-horizon-text"/>
                </div>
                <div>
                  <Label htmlFor="message" className="text-horizon-accent">תוכן ההודעה</Label>
                  <Textarea id="message" placeholder="כתוב את הודעתך כאן..." rows={5} required className="bg-horizon-card border-horizon text-horizon-text"/>
                </div>
                <Button type="submit" className="w-full btn-horizon-primary text-lg py-3">
                  שלח הודעה
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-8">
            <Card className="card-horizon shadow-horizon-strong">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-horizon-primary flex items-center gap-2">
                  <Building className="w-6 h-6" />
                  פרטי התקשרות Horizon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-horizon-primary/20 rounded-full text-horizon-primary">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-horizon-text">מייל לפניות כלליות</h4>
                    <a href="mailto:office@horizon.org.il" className="text-horizon-accent hover:text-horizon-primary transition-colors text-base">
                      office@horizon.org.il
                    </a>
                    <p className="text-sm text-gray-400">מענה תוך 24 שעות בימי עסקים</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-horizon-primary/20 rounded-full text-horizon-primary">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-horizon-text">תמיכה טלפונית</h4>
                    <a href="tel:0533027572" className="text-horizon-accent hover:text-horizon-primary transition-colors text-base">
                      053-302-7572
                    </a>
                    <p className="text-sm text-gray-400">ימים א'-ה', 09:00-17:00</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-horizon-primary/20 rounded-full text-horizon-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-horizon-text">כתובתנו</h4>
                    <p className="text-horizon-accent text-base">תוצרת הארץ 3, פתח תקווה</p>
                    <p className="text-sm text-gray-400">(יש לתאם פגישה מראש)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-horizon shadow-horizon-strong">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-horizon-primary">קישורים שימושיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild variant="link" className="text-horizon-accent hover:text-horizon-primary p-0 text-base flex items-center gap-2 justify-start">
                  <Link to={createPageUrl("FAQ")}>
                    <HelpCircle className="w-4 h-4" />
                    לשאלות נפוצות
                  </Link>
                </Button>
                
                <Button
                  onClick={() => window.open('https://horizon.org.il/', '_blank')}
                  variant="link"
                  className="text-horizon-accent hover:text-horizon-primary p-0 text-base flex items-center gap-2 justify-start w-full"
                >
                  <LinkIcon className="w-4 h-4" />
                  לאתר הבית של קבוצת הורייזן
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Floating Contact Button */}
      <Button
        onClick={() => window.open('https://wa.me/972533027572', '_blank')}
        className="btn-horizon-primary rounded-full h-16 w-16 fixed bottom-6 left-6 shadow-horizon-strong z-50 flex items-center justify-center"
        title="צור קשר בוואטסאפ"
      >
        <Phone className="w-8 h-8" />
      </Button>
    </div>
  );
}
