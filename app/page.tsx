import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Github, Star, Trophy, Target, Database, Shield, Smartphone } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image src="/logo-rounded.png" alt="Arcent Logo" width={32} height={32} className="rounded-full" />
            <span className="text-xl font-bold font-montserrat">Arcent</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#screenshots" className="text-muted-foreground hover:text-foreground transition-colors">
              Screenshots
            </Link>
            <Link href="#download" className="text-muted-foreground hover:text-foreground transition-colors">
              Download
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="https://github.com/Latebrix/Arcent" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black font-montserrat mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Celebrate Every Win
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto font-open-sans">
            Track and document your personal achievements. Build positive momentum by celebrating every victory, no
            matter how small.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="#download">
                <Download className="w-5 h-5 mr-2" />
                Download for Android
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent" asChild>
              <Link href="https://github.com/Latebrix/Arcent" target="_blank" rel="noopener noreferrer">
                <Github className="w-5 h-5 mr-2" />
                View Source Code
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex justify-center items-center space-x-4 text-sm text-muted-foreground">
            <Badge variant="secondary">Free & Open Source</Badge>
            <Badge variant="secondary">Privacy First</Badge>
            <Badge variant="secondary">No Ads</Badge>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-4">Why Choose Arcent?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built on psychological principles to help you build confidence and create positive momentum in your life.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Trophy className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="font-montserrat">Achievement Tracking</CardTitle>
                <CardDescription>
                  Document every victory with rich details, photos, and categories. Build your personal success story.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Target className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="font-montserrat">Smart Organization</CardTitle>
                <CardDescription>
                  Organize achievements with categories, tags, and advanced search. Find patterns in your success.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Database className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="font-montserrat">Local Hosting with Room</CardTitle>
                <CardDescription>
                  Secure local database storage using Android Room. Your data stays on your device, completely private.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Shield className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="font-montserrat">Privacy First</CardTitle>
                <CardDescription>
                  Your data stays yours. Local storage with optional cloud sync. No tracking, no ads.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Smartphone className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="font-montserrat">Modern Design</CardTitle>
                <CardDescription>
                  Beautiful dark theme with smooth animations. Designed for daily use and motivation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Star className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="font-montserrat">Open Source</CardTitle>
                <CardDescription>
                  Transparent development under MIT license. Community-driven and always improving.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="screenshots" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-4">See Arcent in Action</h2>
            <p className="text-xl text-muted-foreground">
              Experience the beautiful interface designed to motivate and inspire.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-card rounded-2xl p-4 shadow-lg mb-4">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/51f0ac5b-48b0-40da-95d6-3cdd1d2c2d08.jpg-03TnnfPjL6gkwEAthQteRqioR0q3fy.jpeg"
                  alt="Arcent Home Screen"
                  width={250}
                  height={500}
                  className="mx-auto rounded-xl"
                />
              </div>
              <h3 className="font-semibold font-montserrat mb-2">Home Dashboard</h3>
              <p className="text-sm text-muted-foreground">Your achievement overview and quick actions</p>
            </div>

            <div className="text-center">
              <div className="bg-card rounded-2xl p-4 shadow-lg mb-4">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/7e5d4c42-3c0a-4788-a649-fe119e8d03a9.jpg-vgBVEEmEqqrPHJ99STSZNQbvZUOxdV.jpeg"
                  alt="Add Achievement Screen"
                  width={250}
                  height={500}
                  className="mx-auto rounded-xl"
                />
              </div>
              <h3 className="font-semibold font-montserrat mb-2">Add Achievements</h3>
              <p className="text-sm text-muted-foreground">Rich editor with categories and tags</p>
            </div>

            <div className="text-center">
              <div className="bg-card rounded-2xl p-4 shadow-lg mb-4">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f34ab7e6-e15f-49de-b34b-59317ef50716.jpg-OM9WV9VxtEtGv5088B0oXuNQ0t4WFe.jpeg"
                  alt="Achievement Gallery"
                  width={250}
                  height={500}
                  className="mx-auto rounded-xl"
                />
              </div>
              <h3 className="font-semibold font-montserrat mb-2">Achievement Gallery</h3>
              <p className="text-sm text-muted-foreground">Beautiful timeline of your wins</p>
            </div>

            <div className="text-center">
              <div className="bg-card rounded-2xl p-4 shadow-lg mb-4">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/783a5fc7-082c-4436-bdf4-f9fa99b803ad.jpg-PHszmx1BwImij3IWvfAK1wCgcR8JM9.jpeg"
                  alt="Authentication Screen"
                  width={250}
                  height={500}
                  className="mx-auto rounded-xl"
                />
              </div>
              <h3 className="font-semibold font-montserrat mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground">Google sign-in and local Room database options</p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-4">Ready to Start Celebrating?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Download Arcent today and begin building positive momentum in your life. It's free, open source, and
            respects your privacy.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-start mb-8">
            <div className="flex flex-col items-center">
              <Button size="lg" className="text-lg px-8 py-6 opacity-50 cursor-not-allowed" disabled>
                <Download className="w-5 h-5 mr-2" />
                Download on Google Play
              </Button>
              <p className="text-sm text-muted-foreground mt-2">Under testing & review period</p>
            </div>
            <div className="mt-0">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent" asChild>
                <Link href="https://github.com/Latebrix/Arcent/releases" target="_blank" rel="noopener noreferrer">
                  <Download className="w-5 h-5 mr-2" />
                  Download APK
                </Link>
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Version 1.10 Beta • Android 7.0+ • Free & Open Source</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image src="/logo-rounded.png" alt="Arcent Logo" width={32} height={32} className="rounded-full" />
                <span className="text-xl font-bold font-montserrat">Arcent</span>
              </div>
              <p className="text-muted-foreground">
                Celebrate Every Win. Build positive momentum through achievement tracking.
              </p>
            </div>

            <div>
              <h3 className="font-semibold font-montserrat mb-4">Product</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#screenshots" className="hover:text-foreground transition-colors">
                    Screenshots
                  </Link>
                </li>
                <li>
                  <Link href="#download" className="hover:text-foreground transition-colors">
                    Download
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold font-montserrat mb-4">Legal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold font-montserrat mb-4">Connect</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link
                    href="https://github.com/Latebrix/Arcent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="mailto:info@arcent.tech" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 Arcent Team. Open source under MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
