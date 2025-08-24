import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Arcent",
  description: "Privacy Policy for Arcent - Learn how we protect your data and respect your privacy.",
}

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold font-montserrat mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: August 24, 2025</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">1. Introduction</h2>
            <p>
              Welcome to Arcent ("the App"). This application is managed by the Arcent Team ("we," "us," or "our") as an
              open-source, non-profit project. This Privacy Policy explains how we collect, use, and protect your
              information when you use our application. Your privacy is important to us, and we are committed to
              protecting it on a best-effort basis, consistent with our non-profit nature.
            </p>
            <p>By using the App, you agree to the collection and use of information in accordance with this policy.</p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">2. Information We Collect</h2>
            <p>
              We have designed Arcent to collect only the data necessary to provide its features. The data we collect
              depends on how you choose to use the App.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">a) Information You Provide Directly:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Achievements Data:</strong> This includes the title, description, date, categories, and any text
                you enter for your personal achievements. This data is the core content you create within the App.
              </li>
              <li>
                <strong>Media Files:</strong> You may choose to upload images or photos to associate with your
                achievements or your user profile.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">b) Authentication Information:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Local Account:</strong> If you create a local account, we store your username and session
                information.
              </li>
              <li>
                <strong>Google Sign-In:</strong> If you choose to sign in with Google, we collect your name, email
                address, and Google ID token from Google to authenticate your account.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">c) Optional Crash Analytics Data (Opt-in):</h3>
            <p>
              To help us improve the App, you have the option to share crash analytics data with us. This is not enabled
              by default. If you opt-in, the following data may be collected:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Technical Information:</strong> Non-personal device identifiers, device type, and operating
                system version.
              </li>
              <li>
                <strong>Crash Reports:</strong> Error logs, exceptions, and, in some cases, screenshots taken at the
                moment a crash occurs to help us diagnose the issue.
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>To Provide and Maintain the Service:</strong> To save, manage, and display your achievements as
                you record them.
              </li>
              <li>
                <strong>To Enable Cloud Sync (Optional):</strong> If you choose to enable cloud features, we use your
                data to sync your achievements across your devices. This is an optional feature. The App is fully
                functional in an offline, local-only mode.
              </li>
              <li>
                <strong>To Authenticate Your Account:</strong> To securely manage your user session and verify your
                identity.
              </li>
              <li>
                <strong>To Improve Our Application:</strong> To identify bugs, diagnose crashes, and improve the App's
                stability and performance, based on the optional crash reports you agree to send.
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">4. Third-Party Services & Data Sharing</h2>
            <p>
              We do not sell your personal data. We use a limited number of third-party services to provide the App's
              functionality. Data may be shared with these services as described below:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Appwrite:</strong> If you enable the optional cloud sync feature, your achievements data and
                images are stored and processed by an Appwrite server. All data transmitted to Appwrite is encrypted.
              </li>
              <li>
                <strong>Google Play Services:</strong> Used for the "Sign in with Google" feature. We only receive basic
                profile information for authentication.
              </li>
              <li>
                <strong>Sentry:</strong> If you opt-in to share crash analytics, technical and crash-related data is
                sent to Sentry for analysis. This data helps us fix bugs.
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">5. Data Storage and Security</h2>
            <p>We take the security of your data seriously and implement measures to protect it.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Local Storage:</strong> All your data stored locally on your device, including your achievements
                and session tokens, is encrypted using standard Android security libraries (Room Database and
                EncryptedSharedPreferences).
              </li>
              <li>
                <strong>Cloud Storage:</strong> For users who opt-in to cloud sync, data is stored on an Appwrite
                server.
              </li>
              <li>
                <strong>Network Security:</strong> All communication between the App and external servers (Appwrite,
                Google, Sentry) is encrypted using HTTPS/TLS.
              </li>
            </ul>
            <p className="mt-4">
              As a non-profit, open-source project, we protect your data on a <strong>best-effort basis</strong>. While
              we implement strong security practices, we cannot offer an absolute guarantee against server-side breaches
              or data leaks.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">6. Your Choices and Rights</h2>
            <p>You have control over your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Local-Only Mode:</strong> You can use the App entirely offline without creating a cloud account.
              </li>
              <li>
                <strong>Crash Reporting:</strong> You can enable or disable the collection of crash analytics data at
                any time in the App's settings.
              </li>
              <li>
                <strong>Access, Modify, and Delete:</strong> You can access, edit, and delete your achievements and
                personal data directly within the App. Deleting your account will remove all associated cloud data.
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">7. Data Retention</h2>
            <p>
              <strong>
                When you delete your account or manually delete your data from within the App, the following actions are
                taken:
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>
                  Your personal data and achievement information (text, dates, etc.) stored on our cloud servers are
                  deleted immediately.
                </strong>
              </li>
              <li>
                <strong>
                  Associated media files, such as images you have uploaded, are scheduled for deletion and will be
                  permanently removed from our storage servers within a maximum of 14 days.
                </strong>
              </li>
              <li>
                <strong>
                  Please note that anonymized or non-personally identifiable crash and error reports sent to Sentry are
                  not subject to this deletion policy. We retain this technical data indefinitely to monitor the
                  long-term stability and performance of the application.
                </strong>
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">8. Children's Privacy</h2>
            <p>
              Arcent does not knowingly collect any personally identifiable information from children under the age of
              13. If you believe that your child has provided this kind of information, we strongly encourage you to
              contact us immediately, and we will do our best to promptly remove such information from our records.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibent font-montserrat mb-4">9. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy in the App and updating the "Last Updated" date. You are advised to review this Privacy
              Policy periodically for any changes.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6">
            <h2 className="text-2xl font-semibold font-montserrat mb-4">10. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
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
