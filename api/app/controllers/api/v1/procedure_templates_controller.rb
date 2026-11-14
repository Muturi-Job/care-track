module Api
  module V1
    class ProcedureTemplatesController < ApplicationController
      # ACCESS CONTROL LATER: staff-only in a real system (CLAUDE.md rule 1).
      def index
        templates = ProcedureTemplate.includes(:stage_templates).order(:name)

        render json: {
          procedure_templates: templates.map do |template|
            ProcedureTemplateSerializer.new(template).as_json
          end
        }
      end
    end
  end
end
