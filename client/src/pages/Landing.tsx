import { motion } from "framer-motion";
import { Heart, MapPin, Users, Sparkles, ArrowRight, Star, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-soft-beige">
      <header className="fixed top-0 left-0 right-0 z-50 bg-soft-beige/80 backdrop-blur-md border-b border-warm-teal/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-warm-teal to-warm-teal/80 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-outfit font-bold text-charcoal">FamVoy</span>
          </div>
          <SignInButton mode="modal">
            <Button variant="outline" className="rounded-full border-warm-teal text-warm-teal hover:bg-warm-teal hover:text-white" data-testid="link-login">
              Sign In
            </Button>
          </SignInButton>
        </div>
      </header>

      <main className="pt-20">
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-warm-teal/5 to-transparent" />
          <div className="absolute top-20 left-10 w-64 h-64 bg-warm-coral/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-warm-teal/10 rounded-full blur-3xl" />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-warm-coral/10 text-warm-coral rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Discover experiences families love
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-outfit font-bold text-charcoal mb-6 leading-tight">
              Create unforgettable <br />
              <span className="text-warm-teal">family adventures</span>
            </h1>
            
            <p className="text-lg md:text-xl text-charcoal/70 mb-8 max-w-xl mx-auto">
              Discover kid-friendly experiences, connect with like-minded families, 
              and build memories that last a lifetime.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto bg-warm-teal hover:bg-warm-teal/90 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-warm-teal/20" data-testid="button-get-started">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </SignUpButton>
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 py-6 text-lg border-charcoal/20 text-charcoal hover:bg-charcoal/5">
                Learn More
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-charcoal/60">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-warm-teal to-warm-coral border-2 border-soft-beige" />
                  ))}
                </div>
                <span>1,000+ families</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warm-coral fill-warm-coral" />
                <span>4.9 rating</span>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-outfit font-bold text-charcoal mb-4">
                Everything your family needs
              </h2>
              <p className="text-charcoal/60 max-w-xl mx-auto">
                From discovering local adventures to connecting with other families, 
                FamVoy makes family time magical.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: MapPin,
                  title: "Discover Experiences",
                  description: "Find kid-friendly activities, hidden gems, and local adventures curated by real families.",
                  color: "warm-teal"
                },
                {
                  icon: Users,
                  title: "Connect with Families",
                  description: "Match with like-minded families nearby for playdates, adventures, and lasting friendships.",
                  color: "warm-coral"
                },
                {
                  icon: Heart,
                  title: "Build Your Pods",
                  description: "Create private groups with your trusted circle to plan and share experiences together.",
                  color: "charcoal"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-soft-beige rounded-3xl p-8 hover:shadow-xl transition-shadow duration-300"
                  data-testid={`card-feature-${index}`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-${feature.color}/10 flex items-center justify-center mb-6`}
                    style={{ backgroundColor: feature.color === 'warm-teal' ? 'rgba(42, 157, 143, 0.1)' : feature.color === 'warm-coral' ? 'rgba(255, 127, 80, 0.1)' : 'rgba(51, 51, 51, 0.1)' }}
                  >
                    <feature.icon className="w-7 h-7" style={{ color: feature.color === 'warm-teal' ? '#2A9D8F' : feature.color === 'warm-coral' ? '#FF7F50' : '#333' }} />
                  </div>
                  <h3 className="text-xl font-outfit font-semibold text-charcoal mb-3">{feature.title}</h3>
                  <p className="text-charcoal/60">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-outfit font-bold text-charcoal mb-4">
                Why families love FamVoy
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Shield,
                  title: "Private & Safe",
                  description: "Your family's data is protected. Share only with families you trust."
                },
                {
                  icon: Zap,
                  title: "Easy to Use",
                  description: "Intuitive design that even the busiest parents can navigate."
                },
                {
                  icon: Sparkles,
                  title: "Curated Quality",
                  description: "Real experiences shared by real families, not anonymous reviews."
                }
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-6"
                >
                  <div className="w-10 h-10 rounded-xl bg-warm-teal/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-warm-teal" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-semibold text-charcoal mb-1">{benefit.title}</h3>
                    <p className="text-sm text-charcoal/60">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center bg-gradient-to-br from-warm-teal to-warm-teal/80 rounded-3xl p-12 md:p-16 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-outfit font-bold text-white mb-4">
                Ready to start your family adventure?
              </h2>
              <p className="text-white/80 mb-8 max-w-lg mx-auto">
                Join thousands of families already discovering amazing experiences together.
              </p>
              <SignUpButton mode="modal">
                <Button size="lg" className="bg-white text-warm-teal hover:bg-white/90 rounded-full px-8 py-6 text-lg shadow-lg" data-testid="button-cta-signup">
                  Create Free Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </SignUpButton>
            </div>
          </motion.div>
        </section>

        <footer className="py-12 px-4 border-t border-charcoal/10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-warm-teal to-warm-teal/80 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="font-outfit font-semibold text-charcoal">FamVoy</span>
            </div>
            <p className="text-sm text-charcoal/50">
              © {new Date().getFullYear()} FamVoy. Making family time magical.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
