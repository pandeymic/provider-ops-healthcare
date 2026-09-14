# ADR 001: Use synthetic data by default

Status: accepted

Provider Ops is a portfolio-grade operations demo. It deliberately uses generated records and a mock clearinghouse so the repository cannot accidentally expose PHI. Any production variant must add threat modeling, access review, encryption, retention policies, and an approved identity provider before connecting to healthcare systems.
