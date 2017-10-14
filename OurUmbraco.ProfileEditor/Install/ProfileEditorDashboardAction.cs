using System.Xml;
using umbraco.interfaces;
using Umbraco.Core.IO;
using Umbraco.Core;

namespace OurUmbraco.ProfileEditor.Install
{
    public class EditProfleDashboardAction : IPackageAction
    {
        private const string sectionXPth = "//section[@alias='Profile']";
       
        private const string tabXPath = "//section[@alias='Profile']/tab[@caption='Profile']";


        public string Alias()
        {
            return "ProfileEditorDashboard";
        }

        public bool Execute(string packageName, XmlNode xmlData)
        {
           
            string dbConfig = SystemFiles.DashboardConfig;
            XmlDocument dashboardFile = XmlHelper.OpenAsXmlDocument(dbConfig);

            XmlNode existingSection = dashboardFile.SelectSingleNode(sectionXPth);

            if (existingSection == null)
            {
                string xmlsection = @"<section alias=""Profile""><areas><area>content</area></areas>
                                <tab caption=""Profile"">
                              <control showOnce=""true"" addPanel=""true"">/App_Plugins/OurUmbraco.ProfileEditor/views/profile.html</control>
                                </tab></section> ";

                XmlNode dashboardNode = dashboardFile.SelectSingleNode("//dashBoard");

                if (dashboardNode != null)
                {
                    XmlDocument xmlNodeToAdd = new XmlDocument();
                    xmlNodeToAdd.LoadXml(xmlsection);
                                       
                    var toAdd = xmlNodeToAdd.SelectSingleNode("*");

                    dashboardNode.PrependChild(dashboardNode.OwnerDocument.ImportNode(toAdd, true));

                    dashboardFile.Save(IOHelper.MapPath(dbConfig));
                }
                  

                
            }

            return true;

        }


        public bool Undo(string packageName, XmlNode xmlData)
        {

            string dbConfig = SystemFiles.DashboardConfig;
            XmlDocument dashboardFile = XmlHelper.OpenAsXmlDocument(dbConfig);

            XmlNode section = dashboardFile.SelectSingleNode(sectionXPth);

            if (section != null)
            {

                dashboardFile.SelectSingleNode(sectionXPth).RemoveChild(section);
                dashboardFile.Save(IOHelper.MapPath(dbConfig));
            }

            return true;
        }


        public XmlNode SampleXml()
        {
            var xml = "<Action runat=\"install\" undo=\"true\" alias=\"ProfileEditorDashboard\" />";
            XmlDocument x = new XmlDocument();
            x.LoadXml(xml);
            return x;
        }
    }
}
