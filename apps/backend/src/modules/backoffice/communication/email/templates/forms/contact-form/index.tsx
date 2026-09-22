import { Heading, Hr, Section, Text } from '@react-email/components';

import * as React from 'react';

import EmailLayout from '../../../components/EmailLayout';
import { createEmailStyles, emailBrand } from '../../../styles';

export interface ContactFormTemplateProps {
    darkMode?: boolean;
    email: string;
    locale?: string;
    message: string;
    name: string;
    phone?: string;
    topic: string;
    websiteUrl?: string;
}

/** Ops notification — new marketing-site contact form submission. */
export const ContactFormTemplate: React.FC<ContactFormTemplateProps> = ({
    name,
    email,
    phone,
    topic,
    message,
    darkMode = false,
    websiteUrl,
}) => {
    const styles = createEmailStyles(darkMode);

    return (
        <EmailLayout
            darkMode={darkMode}
            websiteUrl={websiteUrl}
            previewText={`Contact form — ${name} (${topic})`}
            title="Contact form">
            <Heading style={styles.heading}>New contact form submission</Heading>

            <Section style={styles.section}>
                <Text style={styles.text}>
                    <strong>Name:</strong> {name}
                </Text>
                <Text style={styles.text}>
                    <strong>Email:</strong> {email}
                </Text>
                {phone ? (
                    <Text style={styles.text}>
                        <strong>Phone:</strong> {phone}
                    </Text>
                ) : null}
                <Text style={styles.text}>
                    <strong>Topic:</strong> {topic}
                </Text>

                <Hr
                    style={{
                        border: 'none',
                        borderTop: `1px solid ${emailBrand.hairline}`,
                        margin: '16px 0',
                    }}
                />

                <Text style={styles.text}>
                    <strong>Message:</strong>
                </Text>
                <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>{message}</Text>

                <Text style={styles.noteText}>
                    Reply directly to this email to respond to the sender.
                </Text>
            </Section>
        </EmailLayout>
    );
};

export default ContactFormTemplate;
