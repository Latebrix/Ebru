import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Use - Arcent",
  description: "Terms of Use for Arcent - Understand the terms and conditions for using our achievement tracking app.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold font-montserrat mb-2">Terms of Use</h1>
          <p className="text-muted-foreground">Last Updated: August 24, 2025</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using the Arcent application ("the App"), you agree to be bound by these
              Terms of Use ("Terms"). If you do not agree to these Terms, do not use the App. These Terms are a legal
              agreement between you and the Arcent Team ("we," "us," or "our").
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">2. Nature of the Service</h2>
            <p>
              Arcent is an open-source, non-profit project provided for public benefit. The App is offered to you "As
              Is" and "As Available" without any warranties. Our goal is to provide a useful tool for personal tracking,
              but we do so without a commercial objective.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">3. User Accounts</h2>
            <p>
              You are responsible for safeguarding your account information and for all activities that occur under your
              account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">4. Intellectual Property</h2>
            <p>
              The App and its original content, features, branding, and functionality are and will remain the exclusive
              property of the Arcent Team.{" "}
              <strong>
                The project's source code is made available under the MIT License. Contributions to the project are
                welcome and are governed by the terms of this license.
              </strong>
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">5. Disclaimers and Limitation of Liability</h2>
            <p>Your use of the App is at your sole risk.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">No Warranties:</h3>
            <p>
              The App is provided without warranties of any kind, whether express or implied, including, but not limited
              to, implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Limitation of Liability:</h3>
            <p>
              As an open-source, non-profit project, the Arcent Team, its maintainers, and its contributors shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages, including but not
              limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Data Breach or Loss:</strong> We are not liable for any data breaches on third-party servers
                (e.g., Appwrite) or data loss resulting from software failure, hardware failure, or user error.
              </li>
              <li>
                <strong>Service Interruption:</strong> We do not guarantee that the service will be available at all
                times and are not liable for any losses incurred due to service interruption or termination.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">No Compensation:</h3>
            <p>
              You explicitly acknowledge and agree that, due to the non-profit nature of this project,{" "}
              <strong>no financial compensation will be provided for any reason</strong>, including but not limited to
              database failure, data loss, data breaches, or the sudden and permanent termination of the service.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">6. Termination</h2>
            <p>
              We may terminate or suspend your access to the App immediately, without prior notice or liability, for any
              reason whatsoever, including if you breach these Terms. Furthermore, as a non-profit project, we reserve
              the right to discontinue the development or hosting of the App and its services at any time without
              notice.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">7. Changes to These Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. We will provide notice of significant
              changes within the App or through other reasonable means. Your continued use of the App after any such
              changes constitutes your acceptance of the new Terms.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">8. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:info@arcent.tech" className="text-primary hover:underline">
                info@arcent.tech
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
