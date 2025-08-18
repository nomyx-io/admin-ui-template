import React from "react";
import { useRouter } from "next/router";

import AppLayout from "../components/AppLayout";




export default function DashboardPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="container" style={{ padding: "24px" }}>
        <header className="table-header" style={{ position: "relative", marginBottom: "24px" }}>
          <h1>Welcome to NomyxID</h1>
          <h2>Decentralized Identity Management</h2>
        </header>

        {/* Information Cards */}
        <div style={{ marginBottom: 24 }}>
          <div>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div>
                  <p>
                    To create a compliance rule, navigate to the "Compliance Rules" section in the Nomyx dashboard. Here, you can define a new rule by
                    providing a unique identifier and a descriptive name. This process ensures that each compliance rule is distinct and easily
                    recognizable. Once created, these compliance rules can be used to tag and organize various rules associated with an identity,
                    providing a structured and clear representation of the identity's attributes.
                  </p>
                  <p>
                    In the "Identities" section, you can create new identities by generating a DID and associating it with relevant compliance rules.
                    You can also update existing identities, adding or modifying rules to reflect changes in attributes or status. This flexible and
                    decentralized method of managing identities allows for a robust and scalable system that can adapt to various use cases, from
                    personal identity management to organizational credentialing.
                  </p>
                  <p>
                    The minted token can then be transferred or sold, carrying with it the embedded rules that can be verified independently. This
                    approach leverages the power of blockchain technology to provide immutable and transparent records, enhancing trust and authenticity
                    in digital transactions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                  👤
                  0
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Digital Identities</div>
                <button
                  onClick={() => router.push("/identities")}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1890ff',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: 8,
                    textDecoration: 'underline'
                  }}
                >
                  Manage Identities →
                </button>
              </div>
            </div>
          </div>

          <div>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                  👤
                  0
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Trusted Issuers</div>
                <button
                  onClick={() => router.push("/issuers")}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1890ff',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: 8,
                    textDecoration: 'underline'
                  }}
                >
                  Manage Issuers →
                </button>
              </div>
            </div>
          </div>

          <div>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                  👤
                  0
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Claim Topics</div>
                <button
                  onClick={() => router.push("/topics")}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1890ff',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: 8,
                    textDecoration: 'underline'
                  }}
                >
                  Manage Topics →
                </button>
              </div>
            </div>
          </div>

          <div>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  👤
                  0
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Active Claims</div>
                <button
                  onClick={() => router.push("/claims")}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1890ff',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: 8,
                    textDecoration: 'underline'
                  }}
                >
                  View Claims →
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}