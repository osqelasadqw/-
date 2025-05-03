"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSettings, updateSettings } from "@/lib/firebase-service";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon, AlertCircle, CheckCircle, RefreshCw, TerminalIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// სქემა Zod ვალიდაციისთვის
const formSchema = z.object({
  address: z.string().min(2, "მისამართი უნდა იყოს მინიმუმ 2 სიმბოლო").max(500, "მისამართი არ უნდა აღემატებოდეს 500 სიმბოლოს"),
  email: z.string().email("შეიყვანეთ სწორი ელფოსტა"),
  phone: z.string().min(2, "ტელეფონი უნდა იყოს მინიმუმ 2 სიმბოლო").max(50, "ტელეფონი არ უნდა აღემატებოდეს 50 სიმბოლოს"),
  aboutUsContent: z.string().min(10, "ტექსტი უნდა იყოს მინიმუმ 10 სიმბოლო").max(5000, "ტექსტი არ უნდა აღემატებოდეს 5000 სიმბოლოს"),
});

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // დებაგის ფორმატირება
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  
  // ფორმის ინიციალიზაცია
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
      email: "",
      phone: "",
      aboutUsContent: "",
    },
  });
  
  // დებაგინგ ფუნქცია ლოკალურად
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toISOString();
    setDebugInfo(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // მონაცემების ჩატვირთვა
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        addDebugInfo("📥 მიმდინარეობს პარამეტრების ჩატვირთვა...");
        
        const settings = await getSettings();
        
        if (!settings) {
          throw new Error("პარამეტრები ვერ მოიძებნა");
        }
        
        addDebugInfo(`✅ პარამეტრები ჩატვირთულია: ${Object.keys(settings).join(', ')}`);
        
        // დარწმუნდით რომ ყველა მონაცემი არის სტრინგი
        form.reset({
          address: String(settings.address || ""),
          email: String(settings.email || ""),
          phone: String(settings.phone || ""),
          aboutUsContent: String(settings.aboutUsContent || ""),
        });
      } catch (error) {
        console.error("Error fetching settings:", error);
        addDebugInfo(`❌ შეცდომა პარამეტრების ჩატვირთვისას: ${(error as Error).message}`);
        
        toast({
          title: "შეცდომა",
          description: "პარამეტრების ჩატვირთვა ვერ მოხერხდა",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [form, toast]);

  // მონაცემების გაგზავნა
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setSubmitting(true);
      addDebugInfo("📤 მიმდინარეობს პარამეტრების განახლება...");
      
      // დარწმუნდი რომ ყველა ველი არის სტრინგი
      const formattedValues = {
        address: String(values.address),
        email: String(values.email),
        phone: String(values.phone),
        aboutUsContent: String(values.aboutUsContent),
      };
      
      addDebugInfo(`📊 გასაგზავნი მონაცემები: ${JSON.stringify(formattedValues)}`);
      console.time('updateSettings_total_time');
      
      const result = await updateSettings(formattedValues);
      
      console.timeEnd('updateSettings_total_time');
      addDebugInfo(`✅ პარამეტრები წარმატებით განახლდა: ${JSON.stringify(result)}`);
      
      toast({
        title: "წარმატება",
        description: "პარამეტრები წარმატებით განახლდა",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      addDebugInfo(`❌ შეცდომა პარამეტრების განახლებისას: ${(error as Error).message}`);
      
      toast({
        title: "შეცდომა",
        description: `პარამეტრების განახლება ვერ მოხერხდა: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }
  
  // დებაგინგის გასუფთავება
  const clearDebugInfo = () => {
    setDebugInfo([]);
    addDebugInfo("🧹 დებაგ ინფორმაცია გასუფთავდა");
  };
  
  // დატვირთვის ინდიკატორი
  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">საიტის პარამეტრები</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">საიტის პარამეტრები</h1>
      
      <Tabs defaultValue="main" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="main">ძირითადი პარამეტრები</TabsTrigger>
          {showDebug && <TabsTrigger value="debug">დებაგი</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="main">
          <Card>
            <CardHeader>
              <CardTitle>საიტის პარამეტრები</CardTitle>
              <CardDescription>შეიყვანეთ საიტისთვის საჭირო ინფორმაცია</CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} id="settings-form" className="space-y-8">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>მისამართი</FormLabel>
                        <FormControl>
                          <Input placeholder="შეიყვანეთ მისამართი" {...field} />
                        </FormControl>
                        <FormDescription>
                          ეს მისამართი გამოჩნდება საიტის ფუტერში.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ელ-ფოსტა</FormLabel>
                        <FormControl>
                          <Input placeholder="შეიყვანეთ ელ-ფოსტა" {...field} />
                        </FormControl>
                        <FormDescription>
                          საკონტაქტო ელ-ფოსტა გამოჩნდება საიტის ფუტერში.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ტელეფონი</FormLabel>
                        <FormControl>
                          <Input placeholder="შეიყვანეთ ტელეფონის ნომერი" {...field} />
                        </FormControl>
                        <FormDescription>
                          საკონტაქტო ტელეფონი გამოჩნდება საიტის ფუტერში.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="aboutUsContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ჩვენს შესახებ</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="შეიყვანეთ ტექსტი ჩვენს შესახებ გვერდისთვის" 
                            className="min-h-[200px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          ეს ტექსტი გამოჩნდება ჩვენს შესახებ გვერდზე.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? 'დამალე დებაგი' : 'აჩვენე დებაგი'}
                </Button>
                
                {submitting && (
                  <Alert variant="default" className="p-2 bg-transparent border-none">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    <AlertTitle className="text-xs">მიმდინარეობს გაგზავნა...</AlertTitle>
                  </Alert>
                )}
              </div>
              
              <Button 
                type="submit" 
                form="settings-form" 
                disabled={submitting}
                className="min-w-[120px]"
              >
                {submitting ? 'მიმდინარეობს...' : 'შენახვა'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {showDebug && (
          <TabsContent value="debug">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TerminalIcon className="h-5 w-5" />
                    დებაგ ინფორმაცია
                  </CardTitle>
                  <CardDescription>დეტალური ტექნიკური ინფორმაცია გვერდის მუშაობის შესახებ</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={clearDebugInfo}
                >
                  გასუფთავება
                </Button>
              </CardHeader>
              
              <CardContent>
                <div className="bg-slate-950 text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-[400px]">
                  {debugInfo.length === 0 ? (
                    <p className="text-slate-500 italic">დებაგ ინფორმაცია ცარიელია</p>
                  ) : (
                    debugInfo.map((line, i) => (
                      <div key={i} className="py-0.5">
                        {line.includes("❌") ? (
                          <span className="text-red-400">{line}</span>
                        ) : line.includes("✅") ? (
                          <span className="text-green-400">{line}</span>
                        ) : line.includes("📊") ? (
                          <span className="text-blue-400">{line}</span>
                        ) : (
                          line
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  <InfoIcon className="h-3 w-3 inline-block mr-1" />
                  გთხოვთ, მიაწოდოთ ეს ინფორმაცია დეველოპერს პრობლემის შემთხვევაში.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 