import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const PricingPage = () => {
    const [, setLocation] = useLocation();

    const { data: plans = [], isLoading } = useQuery({
      queryKey: ["plans"],
      queryFn: async () => {
        const r = await api.get("/billing/plans");
        return r.data as { id: string; name: string; priceKobo: number; botLimit: number; ramPerBotMb: number; storageGb: number; cpuPerBot: number }[];
      },
    });

    const handleBuyNow = (plan: string, price: number) => {
        setLocation(`/checkout?plan=${plan}&price=${price}`);
    };

    const basicPlan = plans.find(p => p.id === "basic") || { id: "basic", name: "Basic", priceKobo: 140000, botLimit: 1, ramPerBotMb: 450, storageGb: 1, cpuPerBot: 0.3 };
    const proPlan = plans.find(p => p.id === "pro") || { id: "pro", name: "Pro", priceKobo: 299900, botLimit: 3, ramPerBotMb: 1024, storageGb: 3, cpuPerBot: 0.6 };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Buy A Panel
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{basicPlan.name}</CardTitle>
            <CardDescription>Perfect for lightweight panels and scripts with low resource demands</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-4xl font-bold mb-4">₦{(basicPlan.priceKobo / 100).toLocaleString()}/month</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>{basicPlan.ramPerBotMb}MB RAM</li>
              <li>{basicPlan.storageGb}GB Storage</li>
              <li>{basicPlan.cpuPerBot} vCPU</li>
              <li>{basicPlan.botLimit} Active Process{basicPlan.botLimit !== 1 ? 'es' : ''}</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => handleBuyNow(basicPlan.id, basicPlan.priceKobo / 100)}>Buy Now</Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{proPlan.name}</CardTitle>
            <CardDescription>Built for resource-intensive panels, scrapers, and high-performance scripts</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-4xl font-bold mb-4">₦{(proPlan.priceKobo / 100).toLocaleString()}/month</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>{proPlan.ramPerBotMb >= 1024 ? `${proPlan.ramPerBotMb / 1024}GB` : `${proPlan.ramPerBotMb}MB`} RAM</li>
              <li>{proPlan.storageGb}GB Storage</li>
              <li>{proPlan.cpuPerBot} vCPU</li>
              <li>{proPlan.botLimit} Active Process{proPlan.botLimit !== 1 ? 'es' : ''}</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => handleBuyNow(proPlan.id, proPlan.priceKobo / 100)}>Buy Now</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PricingPage;
