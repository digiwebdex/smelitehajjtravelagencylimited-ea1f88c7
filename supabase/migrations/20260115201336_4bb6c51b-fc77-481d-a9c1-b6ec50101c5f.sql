-- Create legal pages table for editable policy content
CREATE TABLE public.legal_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active legal pages" 
ON public.legal_pages 
FOR SELECT 
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert legal pages" 
ON public.legal_pages 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update legal pages" 
ON public.legal_pages 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete legal pages" 
ON public.legal_pages 
FOR DELETE 
USING (is_admin());

-- Insert default Bangladesh travel agency policy content
INSERT INTO public.legal_pages (page_key, title, content) VALUES
('privacy-policy', 'Privacy Policy', '## Privacy Policy for S.M. Elite Hajj Limited

**Effective Date:** January 2025

S.M. Elite Hajj Limited ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.

### 1. Information We Collect

**Personal Information:**
- Full name as per passport/NID
- National ID (NID) number
- Passport details (number, expiry date, issue date)
- Date of birth
- Contact information (phone, email, address)
- Photograph for visa processing
- Emergency contact details
- Medical information (if required for Hajj/Umrah)

**Financial Information:**
- Payment details for booking transactions
- Bank account information for refunds

### 2. How We Use Your Information

We use the collected information to:
- Process Hajj and Umrah visa applications
- Book flights, hotels, and ground transportation
- Communicate important travel updates
- Comply with Saudi Arabia Ministry of Hajj requirements
- Process payments and refunds
- Send promotional offers (with your consent)

### 3. Information Sharing

We share your information with:
- Saudi Arabia Ministry of Hajj and Umrah
- Bangladesh Ministry of Religious Affairs
- Airlines and hotel partners
- Embassy and consulate for visa processing
- Payment processors

We do NOT sell your personal information to third parties.

### 4. Data Security

We implement industry-standard security measures including:
- SSL encryption for data transmission
- Secure storage of physical documents
- Limited employee access to personal data
- Regular security audits

### 5. Data Retention

We retain your information for:
- 7 years for financial records (as per Bangladesh tax laws)
- 5 years for travel documents
- Until deletion request for marketing preferences

### 6. Your Rights

Under Bangladesh Personal Data Protection laws, you have the right to:
- Access your personal data
- Correct inaccurate information
- Request deletion of data (where applicable)
- Opt-out of marketing communications

### 7. Contact Us

For privacy-related inquiries:
- **Email:** info@smelitehajj.com
- **Phone:** +880 1234-567890
- **Address:** Savar, Dhaka, Bangladesh

### 8. Changes to This Policy

We may update this policy periodically. Changes will be posted on our website with the updated effective date.'),

('terms-of-service', 'Terms of Service', '## Terms and Conditions

**S.M. Elite Hajj Limited**
**Trade License No:** [Your Trade License Number]
**Registered with Bangladesh Hajj Agencies Association (BHAA)**

### 1. Acceptance of Terms

By booking any service with S.M. Elite Hajj Limited, you agree to these Terms and Conditions. Please read them carefully before making any booking.

### 2. Booking and Payment Terms

**2.1 Booking Confirmation**
- Booking is confirmed only upon receipt of the required deposit
- Full payment must be received as per the payment schedule
- All payments must be made in Bangladeshi Taka (BDT)

**2.2 Payment Methods**
- Bank transfer to our designated accounts
- Mobile banking (bKash, Nagad, Rocket)
- Cash payment at our office (receipt will be provided)
- Credit/Debit card payments

**2.3 Payment Schedule**
- Hajj Package: 50% deposit at booking, remaining 50% at least 60 days before departure
- Umrah Package: 30% deposit at booking, remaining 70% at least 30 days before departure

### 3. Documents Required

**For Hajj/Umrah Visa:**
- Valid passport (minimum 6 months validity)
- National ID Card (NID)
- Recent passport-size photographs (white background)
- Meningitis (ACWY) vaccination certificate
- COVID-19 vaccination certificate (if required)
- Mahram documents for female pilgrims under 45

### 4. Package Inclusions

Unless otherwise stated, our packages include:
- Round-trip airfare from Dhaka
- Visa processing fees
- Hotel accommodation as specified
- Ground transportation in Saudi Arabia
- Ziyarat tours as per itinerary
- Basic travel insurance

### 5. Package Exclusions

Unless specifically mentioned:
- Personal expenses
- Additional meals beyond package terms
- Tips and gratuities
- Optional tours
- Excess baggage charges
- Medical expenses beyond basic coverage

### 6. Responsibilities

**Our Responsibilities:**
- Arrange all services as per the confirmed itinerary
- Provide experienced tour guides
- Assist with visa processing
- Handle emergency situations

**Pilgrim''s Responsibilities:**
- Provide accurate personal information
- Maintain valid travel documents
- Follow Saudi Arabia''s laws and regulations
- Adhere to group schedules
- Maintain health requirements

### 7. Travel Insurance

Basic travel insurance is included. Pilgrims with pre-existing medical conditions should obtain additional coverage.

### 8. Force Majeure

We are not liable for failures caused by:
- Natural disasters
- War or civil unrest
- Government restrictions
- Pandemic-related closures
- Airline strikes

### 9. Dispute Resolution

Disputes shall be resolved through:
1. Direct negotiation
2. Mediation through BHAA
3. Bangladesh courts (Dhaka jurisdiction)

### 10. Governing Law

These terms are governed by the laws of the People''s Republic of Bangladesh.

### 11. Contact Information

**S.M. Elite Hajj Limited**
- Address: Savar, Dhaka, Bangladesh
- Phone: +880 1234-567890
- Email: info@smelitehajj.com
- BHAA Registration: [Registration Number]'),

('refund-policy', 'Refund Policy', '## Refund and Cancellation Policy

**S.M. Elite Hajj Limited**

We understand that circumstances may require you to cancel your booking. This policy outlines our refund procedures in compliance with Bangladesh consumer protection guidelines.

### 1. Hajj Package Cancellation

**1.1 Before Visa Submission:**
| Cancellation Period | Refund Amount |
|---------------------|---------------|
| 90+ days before departure | 90% of total payment |
| 60-89 days before departure | 75% of total payment |
| 30-59 days before departure | 50% of total payment |
| Less than 30 days | No refund |

**1.2 After Visa Submission:**
- Visa fees are non-refundable once submitted to Saudi Embassy
- Airline tickets: Subject to airline cancellation policy
- Hotel bookings: Subject to hotel cancellation policy

### 2. Umrah Package Cancellation

| Cancellation Period | Refund Amount |
|---------------------|---------------|
| 45+ days before departure | 85% of total payment |
| 30-44 days before departure | 70% of total payment |
| 15-29 days before departure | 50% of total payment |
| 7-14 days before departure | 25% of total payment |
| Less than 7 days | No refund |

### 3. Non-Refundable Items

The following are non-refundable under any circumstances:
- Visa processing fees (once submitted)
- Airline ticket penalties (as per airline policy)
- Hotel no-show charges
- Insurance premiums
- Service charges and bank fees

### 4. Visa Rejection

**4.1 If Visa is Rejected:**
- Full refund minus visa processing fees
- Refund processed within 15 working days
- Required: Official rejection letter from embassy

**4.2 Rejection Due to Pilgrim''s Fault:**
- Incorrect information provided: No refund
- Incomplete documents: No refund
- Blacklisted passport: No refund

### 5. Medical Cancellation

If cancellation is due to medical emergency:
- Medical certificate required from registered physician
- 80% refund if cancelled 30+ days before departure
- 50% refund if cancelled 15-29 days before departure
- Case-by-case evaluation for emergencies

### 6. Death in Family

In case of death of immediate family member:
- Death certificate required
- 90% refund regardless of timing
- Booking can be transferred to another family member

### 7. Government/Force Majeure Cancellation

If trip is cancelled due to:
- Government travel ban
- Pandemic restrictions
- Natural disasters
- War or civil unrest

**Options provided:**
1. Full credit for future travel (valid 2 years)
2. Refund minus non-recoverable costs
3. Reschedule to later date (subject to availability)

### 8. Refund Process

**8.1 How to Request Refund:**
1. Submit written cancellation request
2. Provide booking reference number
3. Include bank account details for refund
4. Attach required supporting documents

**8.2 Refund Timeline:**
- Processing time: 15-30 working days
- Refund method: Bank transfer to pilgrim''s account
- Currency: Bangladeshi Taka (BDT)

### 9. Partial Cancellation

If cancelling part of the booking (e.g., one family member):
- Package rate may be recalculated
- Single supplement may apply
- Refund based on new package cost

### 10. No-Show Policy

Failure to show up on departure date without prior cancellation:
- No refund will be provided
- Future bookings require full advance payment

### 11. Changes to Booking

**11.1 Name Changes:**
- BDT 5,000 per person (if allowed by airline)
- Must be requested 30+ days before departure

**11.2 Date Changes:**
- Subject to availability
- Price difference applies
- BDT 3,000 administrative fee

### 12. Contact for Refunds

**Accounts Department**
- Email: accounts@smelitehajj.com
- Phone: +880 1234-567890
- Office Hours: Saturday-Thursday, 10:00 AM - 6:00 PM

### 13. Dispute Resolution

If you disagree with a refund decision:
1. Submit written appeal within 14 days
2. Include supporting documentation
3. Decision within 7 working days
4. Final escalation to BHAA if unresolved

---

*This policy is effective from January 2025 and may be updated periodically.*');