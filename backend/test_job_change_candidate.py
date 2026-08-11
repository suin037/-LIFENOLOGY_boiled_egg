import unittest

from models.job_change_candidate import financial_impact, prediction_for_choice


class JobChangeCandidateTest(unittest.TestCase):
    def test_candidate_returns_separated_evidence_and_experiment(self):
        result = financial_impact({
            "age": 29, "sex": "2", "monthly_wage": 320,
            "firm_size": 4, "edu_level": 7, "occupation_group": 3,
            "employment_status": 1, "tenure_years": 2.5,
        })
        self.assertEqual(result["status"], "directional_evidence_not_deployment_approved")
        self.assertEqual(result["population_evidence"]["verdict"], "시간 검증 통과")
        self.assertEqual(result["personalized_estimate"]["status"], "experimental_not_individually_validated")
        self.assertEqual(result["sensitivity_validation"]["decision"], "보류")
        self.assertEqual(result["growth_potential"]["status"], "insufficient_evidence")
        self.assertEqual(result["quality_of_life"]["status"], "insufficient_evidence")
        self.assertEqual(result["input_quality"]["imputed_features"], [])

    def test_non_job_choice_is_not_applicable(self):
        result = prediction_for_choice("진학", {"age": 29})
        self.assertEqual(result["status"], "not_applicable")


if __name__ == "__main__":
    unittest.main()
