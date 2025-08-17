import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Target, Globe, Award, Zap } from "lucide-react";
const AboutUs = () => {
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ForecastGenius</h1>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
              Back to Home
            </a>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200">
            🚀 About ForecastGenius
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Revolutionizing Inventory Management with
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> AI Intelligence</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're on a mission to transform how businesses manage their inventory through cutting-edge AI technology, 
            predictive analytics, and intelligent automation.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                To empower businesses of all sizes with AI-driven insights that optimize inventory management, 
                reduce costs, and maximize profits through intelligent forecasting and automation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                To become the global leader in AI-powered inventory intelligence, enabling businesses to make 
                data-driven decisions with confidence and achieve sustainable growth.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose ForecastGenius?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-none shadow-lg text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>91%+ Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our advanced AI algorithms provide industry-leading forecast accuracy up to 365 days in advance.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Real-time Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get instant notifications and alerts for stock levels, price changes, and market trends.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Enterprise-Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Secure, scalable, and reliable platform trusted by growing businesses worldwide.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Company Story */}
        <Card className="border-none shadow-lg mb-16">
          <CardHeader>
            <CardTitle className="text-center">Our Story</CardTitle>
            <CardDescription className="text-center text-lg">
              Built by experts, designed for success
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-4xl mx-auto">
            <p className="text-gray-600 mb-4">ForecastGenius was founded in 2025 with a simple yet powerful vision: to democratize AI-powered inventory management for businesses of all sizes. Our team of data scientists, engineers, and business experts recognized the growing need for intelligent forecasting solutions in an increasingly complex global marketplace.</p>
            <p className="text-gray-600 mb-4">
              Today, we serve hundreds of businesses across various industries, helping them reduce inventory 
              costs by up to 35% while maintaining optimal stock levels. Our platform combines advanced machine 
              learning algorithms with intuitive user interfaces to make complex data accessible and actionable.
            </p>
            <p className="text-gray-600">
              We're committed to continuous innovation, constantly improving our algorithms and adding new 
              features based on user feedback and market demands. Join us on our journey to revolutionize 
              inventory management through the power of AI.
            </p>
          </CardContent>
        </Card>

        {/* Team Values */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Our Values</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Innovation</h3>
              <p className="text-sm text-gray-600">Continuously pushing boundaries in AI technology</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Accuracy</h3>
              <p className="text-sm text-gray-600">Delivering precise, reliable forecasting results</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Accessibility</h3>
              <p className="text-sm text-gray-600">Making AI technology accessible to all businesses</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-2">Excellence</h3>
              <p className="text-sm text-gray-600">Committed to the highest standards of quality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">ForecastGenius</h3>
          </div>
          <p className="text-gray-400 mb-8">
            Empowering businesses with AI-driven inventory intelligence.
          </p>
          <div className="flex justify-center space-x-8">
            <a href="/" className="text-gray-400 hover:text-white transition-colors">Home</a>
            <a href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>;
};
export default AboutUs;